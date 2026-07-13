export default function NaBrasaPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-stone-950 via-stone-900 to-amber-950 px-6 py-16 text-stone-100">
      <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-6 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-amber-400/80">
          Cardápio online
        </p>
        <h1 className="text-5xl font-semibold tracking-tight text-amber-50 sm:text-6xl">
          Na Brasa
        </h1>
        <p className="max-w-md text-base leading-relaxed text-stone-300 sm:text-lg">
          Lanches artesanais e espetinhos feitos na brasa.
        </p>
        <span className="mt-2 inline-flex items-center justify-center rounded-md bg-amber-500 px-6 py-3 text-sm font-semibold text-stone-950">
          Cardápio em breve
        </span>
      </div>
    </main>
  );
}
