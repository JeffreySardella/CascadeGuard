export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 pb-16">
      <h1 className="text-3xl font-bold text-gray-900 text-center">
        CascadeGuard
      </h1>
      <p className="mt-4 text-xl text-gray-600 text-center max-w-2xl">
        Are your medications treating side effects of each other?
      </p>
      <p className="mt-2 text-base text-gray-500 text-center">
        16% of older adults take medications prescribed to treat side effects of
        other medications.
      </p>

      {/* TODO: P1 builds DrugInput component here */}
      <div className="mt-8 w-full max-w-xl p-6 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-400">
        Drug Input Component (P1)
      </div>

      {/* TODO: Analyze button */}
      <button
        className="mt-6 px-8 py-3 bg-cascade-primary text-white font-semibold rounded-lg hover:bg-cascade-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cascade-primary transition-colors"
        disabled
      >
        Analyze My Medications
      </button>
    </main>
  );
}
