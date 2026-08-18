/**
 * Hook for turning a relative image reference into something the
 * browser can load.
 *
 * The core has no idea what a workspace is — the application installs a
 * resolver (see src/assets.ts) and the image widget asks through here.
 * Keeps `src/editor/**` free of application dependencies, which is also
 * the MIT/AGPL license boundary (see LICENSES.md).
 */

export type ImageResolver = (src: string) => Promise<string | null>;

let resolver: ImageResolver | null = null;

export function setImageResolver(next: ImageResolver | null): void {
  resolver = next;
}

export function resolveImage(src: string): Promise<string | null> {
  return resolver ? resolver(src) : Promise.resolve(null);
}
