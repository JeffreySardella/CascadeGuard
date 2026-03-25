export default function Footer() {
  return (
    <footer className="py-8 px-4 border-t border-gray-200 bg-white">
      <div className="max-w-4xl mx-auto text-center text-sm text-gray-500 space-y-2">
        <p>
          This is an educational screening tool, not medical advice. Do not change
          medications without consulting your physician.
        </p>
        <p>
          Cascade patterns from the{' '}
          <a
            href="https://pmc.ncbi.nlm.nih.gov/articles/PMC12712104/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cascade-primary underline hover:text-cascade-primary-hover"
          >
            PIPC list
          </a>{' '}
          (European Geriatric Medicine, 2025). FDA data from{' '}
          <a
            href="https://open.fda.gov/apis/drug/event/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cascade-primary underline hover:text-cascade-primary-hover"
          >
            openFDA FAERS
          </a>
          .
        </p>
        <p className="text-gray-400">
          Built by Jeff Sardella &middot; &copy; {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}
