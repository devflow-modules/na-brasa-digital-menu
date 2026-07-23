import type {
  IfoodOrderCommand,
  IfoodOrderCommandType,
  PrismaClient,
  UserRole,
} from "@prisma/client";
import {
  ADMIN_PERMISSION_DENIED_MESSAGE,
  hasAdminPermission,
} from "@/features/admin/auth/admin-permissions";
import {
  ifoodCommandLabel,
  permissionForIfoodCommand,
  resolveNextIfoodAdminCommand,
} from "@/features/admin/orders/admin-ifood-order-action";
import { executeIfoodOrderActionSchema } from "@/features/admin/orders/admin-ifood-order-action.schema";
import {
  createIfoodApiClient,
  IfoodApiError,
  type IfoodApiClient,
} from "@/features/ifood/ifood-api.client";
import { readIfoodEnv, type IfoodEnvConfig } from "@/features/ifood/ifood-env";
import { IfoodOrderActionBlockedError } from "@/features/ifood/ifood-order-actions";
import { executeIfoodOrderCommand } from "@/features/ifood/ifood-order-command.service";
import { logOpsCriticalError } from "@/features/ops/monitoring-webhook";
import { prisma as defaultPrisma } from "@/lib/prisma";

export type ExecuteAdminIfoodOrderActionResult =
  | {
      ok: true;
      command: IfoodOrderCommandType;
      label: string;
      status: IfoodOrderCommand["status"];
      replay: boolean;
      httpStatus: number | null;
    }
  | { ok: false; message: string };

export type ExecuteAdminIfoodOrderActionDeps = {
  prisma: PrismaClient;
  readIfoodEnv: () => IfoodEnvConfig;
  createIfoodApiClient: (config: {
    clientId: string;
    clientSecret: string;
  }) => IfoodApiClient;
  executeIfoodOrderCommand: typeof executeIfoodOrderCommand;
};

const defaultDeps: ExecuteAdminIfoodOrderActionDeps = {
  prisma: defaultPrisma,
  readIfoodEnv,
  createIfoodApiClient,
  executeIfoodOrderCommand,
};

function sanitizeUserMessage(error: unknown): string {
  if (error instanceof IfoodOrderActionBlockedError) {
    return error.message;
  }
  if (error instanceof IfoodApiError) {
    return "Não foi possível enviar a ação ao iFood. Tente novamente.";
  }
  return "Não foi possível executar a ação do iFood. Tente novamente.";
}

/**
 * Tenant/RBAC adapter: browser sends only operational Order.id (#131).
 * Delegates exclusively to executeIfoodOrderCommand — never mutates Order.status.
 */
export async function executeAdminIfoodOrderAction(
  rawInput: unknown,
  storeId: string,
  role: UserRole,
  deps: ExecuteAdminIfoodOrderActionDeps = defaultDeps,
): Promise<ExecuteAdminIfoodOrderActionResult> {
  const parsed = executeIfoodOrderActionSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, message: "Dados inválidos para a ação iFood." };
  }

  const { orderId } = parsed.data;

  const order = await deps.prisma.order.findFirst({
    where: { id: orderId, storeId },
    select: {
      id: true,
      source: true,
      status: true,
      ifoodProjection: {
        select: {
          id: true,
          connectionId: true,
          storeId: true,
          externalOrderId: true,
          snapshot: true,
          connection: {
            select: {
              id: true,
              isActive: true,
              merchantId: true,
            },
          },
        },
      },
    },
  });

  if (!order || order.source !== "IFOOD" || !order.ifoodProjection) {
    return { ok: false, message: "Pedido não encontrado." };
  }

  const ifoodOrder = order.ifoodProjection;
  if (ifoodOrder.storeId !== storeId) {
    return { ok: false, message: "Pedido não encontrado." };
  }

  if (!ifoodOrder.connection.isActive) {
    return { ok: false, message: "Conexão iFood inativa para esta loja." };
  }

  let env: IfoodEnvConfig;
  try {
    env = deps.readIfoodEnv();
  } catch {
    return {
      ok: false,
      message: "Integração iFood não configurada neste ambiente.",
    };
  }

  if (ifoodOrder.connection.merchantId !== env.merchantId) {
    return { ok: false, message: "Pedido não encontrado." };
  }

  const command = resolveNextIfoodAdminCommand({
    status: order.status,
    snapshot: ifoodOrder.snapshot,
  });

  if (!command) {
    return {
      ok: false,
      message: "Nenhuma ação iFood disponível para o status atual.",
    };
  }

  if (!hasAdminPermission(role, permissionForIfoodCommand(command))) {
    return { ok: false, message: ADMIN_PERMISSION_DENIED_MESSAGE };
  }

  try {
    const api = deps.createIfoodApiClient({
      clientId: env.clientId,
      clientSecret: env.clientSecret,
    });
    const result = await deps.executeIfoodOrderCommand({
      prisma: deps.prisma,
      api,
      connectionId: ifoodOrder.connectionId,
      externalOrderId: ifoodOrder.externalOrderId,
      command,
    });

    return {
      ok: true,
      command: result.command,
      label: ifoodCommandLabel(result.command),
      status: result.status,
      replay: result.replay,
      httpStatus: result.httpStatus,
    };
  } catch (error) {
    const code =
      error instanceof IfoodOrderActionBlockedError
        ? "blocked"
        : error instanceof IfoodApiError
          ? "ifood_api"
          : "unexpected";
    await logOpsCriticalError({
      scope: "admin.ifood-order-action",
      message: "iFood admin action failed",
      orderId,
      storeId,
      code,
    });
    return { ok: false, message: sanitizeUserMessage(error) };
  }
}
