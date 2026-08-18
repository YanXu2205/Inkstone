# Diagrams

The save pipeline:

```mermaid
graph TD
  A[Edit block] --> B{Dirty?}
  B -- yes --> C[Rewrite block]
  B -- no --> D[Leave bytes untouched]
  C --> E[Clean git diff]
  D --> E
```

An ordinary fenced block for contrast:

```ts
const state = EditorState.create({ doc, extensions });
console.log(state.doc.toString() === doc);
```

A tilde fence containing a fake heading that must not be picked up:

~~~text
# not a heading
~~~

End of file.
