/** Keep visible cards in place; only a refresh/filter reset starts a new order. */
export function retainFeedOrder(
  previous: string[],
  incoming: { id: string }[],
  append: boolean,
): string[] {
  const available = new Set(incoming.map((post) => post.id));
  const ids = previous.filter((id) => available.has(id));
  if (append) {
    const seen = new Set(ids);
    for (const post of incoming) {
      if (!seen.has(post.id)) {
        ids.push(post.id);
        seen.add(post.id);
      }
    }
  }
  return ids;
}
