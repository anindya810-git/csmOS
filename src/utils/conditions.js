// Evaluate advanced-search conditions with mixed AND / OR.
//
// Each condition (after the first) carries a `connector` of 'AND' or 'OR'.
// We read them in disjunctive normal form, AND binding tighter than OR:
//
//   A  AND B  OR C  AND D   ==   (A AND B) OR (C AND D)
//
// i.e. consecutive AND-joined conditions form a group; an 'OR' connector
// starts a new group; a row matches if ANY group fully matches.
export function evalConditions(conditions, matchFn) {
  if (!conditions || conditions.length === 0) return true;
  const groups = [];
  conditions.forEach((c, i) => {
    if (i === 0 || c.connector === 'OR') groups.push([c]);
    else groups[groups.length - 1].push(c);
  });
  return groups.some(group => group.every(c => matchFn(c)));
}
