import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Mirrors the dismiss + focus-restoration logic used by the CSV
 * confirmation banner inside `BlogDataTable.tsx`.
 *
 * Keeping a focused harness here avoids loading the full data layer
 * (useAthleteData, network fetches) just to assert behaviour that lives
 * entirely in the banner's dismiss callback.
 */
function CsvConfirmationHarness() {
  const [csvConfirmation, setCsvConfirmation] = useState<
    { name: string; email: string } | null
  >({ name: "Ada", email: "ada@example.com" });
  const csvButtonRef = useRef<HTMLButtonElement | null>(null);
  const confirmationRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (csvConfirmation && confirmationRef.current) {
      confirmationRef.current.focus();
    }
  }, [csvConfirmation]);

  const dismissConfirmation = useCallback(() => {
    setCsvConfirmation(null);
    requestAnimationFrame(() => {
      csvButtonRef.current?.focus();
    });
  }, []);

  return (
    <div>
      <button ref={csvButtonRef} onClick={() => setCsvConfirmation({ name: "Ada", email: "ada@example.com" })}>
        CSV
      </button>
      {csvConfirmation && (
        <div ref={confirmationRef} tabIndex={-1} role="region" aria-label="CSV download confirmation">
          <span>Queued for {csvConfirmation.name}</span>
          <button onClick={dismissConfirmation} aria-label="Dismiss confirmation">
            ×
          </button>
        </div>
      )}
    </div>
  );
}

describe("CSV confirmation banner dismissal", () => {
  it("removes the banner when the close button is clicked", () => {
    render(<CsvConfirmationHarness />);
    expect(screen.getByRole("region", { name: /csv download confirmation/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /dismiss confirmation/i }));

    expect(screen.queryByRole("region", { name: /csv download confirmation/i })).not.toBeInTheDocument();
  });

  it("restores focus to the CSV button after dismissal", async () => {
    // jsdom doesn't implement requestAnimationFrame's timing reliably; shim it.
    const rafSpy = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((cb: FrameRequestCallback) => {
        cb(0);
        return 0;
      });

    render(<CsvConfirmationHarness />);
    const csvButton = screen.getByRole("button", { name: "CSV" });

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /dismiss confirmation/i }));
    });

    expect(document.activeElement).toBe(csvButton);
    rafSpy.mockRestore();
  });
});
