export default function AdminPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-stone-100 px-6 py-16 text-stone-900">
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-stone-500">
          Área restrita
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Admin</h1>
        <p className="text-base leading-relaxed text-stone-600">
          Painel administrativo do Na Brasa. Autenticação e gestão de pedidos
          serão implementadas em breve.
        </p>
      </div>
    </main>
  );
}
