/**
 * AIExplanation — P4's component
 *
 * Renders Gemini 2.5 Flash plain-language explanation of detected cascades.
 * Falls back to templated text if AI is unavailable.
 *
 * Requirements:
 * - Styled card below the visualization
 * - Loading state while Gemini 2.5 Flash generates
 * - Fallback to aiExplanationFallback from margaret.json
 * - Text at readable size (text-lg minimum)
 */

'use client';

interface AIExplanationProps {
  explanation: string;
  isLoading: boolean;
}

export default function AIExplanation({ explanation, isLoading }: AIExplanationProps) {
  // TODO: P4 implements this
  return (
    <section
      className="w-full max-w-3xl mt-6 p-6 bg-gray-50 rounded-lg border border-gray-200"
      aria-label="AI-generated explanation of detected cascades"
    >
      <h2 className="text-xl font-semibold text-gray-800 mb-3">What This Means</h2>
      {isLoading ? (
        <p className="text-lg text-gray-500 animate-pulse">Generating explanation...</p>
      ) : (
        <p className="text-lg text-gray-700 whitespace-pre-line">{explanation}</p>
      )}
    </section>
  );
}
