import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MarkdownRenderer } from "@/components/markdown-renderer";

describe("MarkdownRenderer", () => {
  it("renders heading", async () => {
    render(<MarkdownRenderer content="# Hello World" />);
    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Hello World");
    });
  });

  it("renders paragraph", async () => {
    render(<MarkdownRenderer content="This is a paragraph" />);
    await waitFor(() => {
      expect(screen.getByText("This is a paragraph")).toBeInTheDocument();
    });
  });

  it("renders bold text", async () => {
    render(<MarkdownRenderer content="**bold text**" />);
    await waitFor(() => {
      expect(screen.getByText("bold text")).toBeInTheDocument();
    });
  });

  it("renders a list", async () => {
    render(<MarkdownRenderer content={`- Item 1\n- Item 2`} />);
    await waitFor(() => {
      const items = screen.getAllByRole("listitem");
      expect(items.length).toBeGreaterThanOrEqual(1);
    });
  });
});
