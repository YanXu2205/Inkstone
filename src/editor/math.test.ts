import { describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { ensureSyntaxTree } from "@codemirror/language";
import { baseExtensions } from "./editor";
import { mathBody } from "./math";

interface Node {
  name: string;
  text: string;
}

/** Parse with the app's own markdown parser and collect the custom nodes. */
function customNodes(doc: string): Node[] {
  const state = EditorState.create({ doc, extensions: baseExtensions() });
  const tree = ensureSyntaxTree(state, doc.length, 5000);
  expect(tree, "the markdown parser did not finish").not.toBeNull();
  const found: Node[] = [];
  tree!.iterate({
    enter: (ref) => {
      if (ref.name === "InlineMath" || ref.name === "DisplayMath" || ref.name === "Highlight") {
        found.push({ name: ref.name, text: doc.slice(ref.from, ref.to) });
      }
    },
  });
  return found;
}

describe("the $…$ inline math parser", () => {
  it("recognises inline math inside a sentence", () => {
    expect(customNodes("Energy is $E = mc^2$ exactly.\n")).toEqual([
      { name: "InlineMath", text: "$E = mc^2$" },
    ]);
  });

  it("recognises display math delimited by double dollars", () => {
    expect(customNodes("$$\\int x\\,dx$$\n")).toEqual([
      { name: "DisplayMath", text: "$$\\int x\\,dx$$" },
    ]);
  });

  it("keeps display math that spans several lines as a single node", () => {
    const nodes = customNodes("$$\na &= b \\\\\nc &= d\n$$\n");
    expect(nodes).toHaveLength(1);
    expect(nodes[0].name).toBe("DisplayMath");
    expect(nodes[0].text).toBe("$$\na &= b \\\\\nc &= d\n$$");
  });

  it("does not treat a lone dollar sign as math", () => {
    expect(customNodes("It costs $5 and no more.\n")).toEqual([]);
  });

  it("does not let inline math run across a line break", () => {
    expect(customNodes("open $x\nstill x$ closed\n")).toEqual([]);
  });

  it("rejects empty delimiters", () => {
    expect(customNodes("nothing $$ here\n")).toEqual([]);
  });

  it("finds several math spans in one paragraph", () => {
    expect(customNodes("$a$ then $b$ then $$c$$\n").map((n) => n.text)).toEqual([
      "$a$",
      "$b$",
      "$$c$$",
    ]);
  });

  it("treats an escaped dollar inside math as part of the formula", () => {
    expect(customNodes("$a \\$ b$ tail\n")).toEqual([{ name: "InlineMath", text: "$a \\$ b$" }]);
  });
});

describe("the ==highlight== inline parser", () => {
  it("recognises a highlight span", () => {
    expect(customNodes("some ==marked text== here\n")).toEqual([
      { name: "Highlight", text: "==marked text==" },
    ]);
  });

  it("recognises highlights around CJK text", () => {
    expect(customNodes("这是 ==本地优先== 的编辑器\n")).toEqual([
      { name: "Highlight", text: "==本地优先==" },
    ]);
  });

  it("does not let a highlight run across a line break", () => {
    expect(customNodes("==open\nclose==\n")).toEqual([]);
  });

  it("ignores a single equals sign and an unclosed marker", () => {
    expect(customNodes("a = b and ==unclosed\n")).toEqual([]);
  });

  it("leaves a setext underline alone", () => {
    expect(customNodes("Title\n=====\n")).toEqual([]);
  });
});

describe("mathBody", () => {
  it("strips double dollars and reports display mode", () => {
    expect(mathBody("$$x^2$$")).toEqual({ tex: "x^2", display: true });
  });

  it("strips single dollars and reports inline mode", () => {
    expect(mathBody("$x^2$")).toEqual({ tex: "x^2", display: false });
  });

  it("trims the whitespace a multi-line block leaves behind", () => {
    expect(mathBody("$$\n  a = b\n$$")).toEqual({ tex: "a = b", display: true });
  });

  it("returns an empty formula for bare delimiters", () => {
    expect(mathBody("$$$$")).toEqual({ tex: "", display: true });
    expect(mathBody("$$")).toEqual({ tex: "", display: false });
  });
});
