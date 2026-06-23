export interface DiffChange {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
}

/**
 * Compare deux chaînes de caractères au niveau des mots (en conservant les espaces).
 * Retourne une liste de segments typés (added, removed, unchanged).
 */
export function diffWords(oldStr: string = '', newStr: string = ''): DiffChange[] {
  const oldVal = oldStr || '';
  const newVal = newStr || '';

  // Découpe le texte par mots tout en conservant les espaces et retours à la ligne
  const oldWords = oldVal.split(/(\s+)/).filter(Boolean);
  const newWords = newVal.split(/(\s+)/).filter(Boolean);

  const dp: number[][] = Array(oldWords.length + 1)
    .fill(null)
    .map(() => Array(newWords.length + 1).fill(0));

  for (let i = 1; i <= oldWords.length; i++) {
    for (let j = 1; j <= newWords.length; j++) {
      if (oldWords[i - 1] === newWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const diff: DiffChange[] = [];
  let i = oldWords.length;
  let j = newWords.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      diff.push({ type: 'unchanged', value: oldWords[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      diff.push({ type: 'added', value: newWords[j - 1] });
      j--;
    } else {
      diff.push({ type: 'removed', value: oldWords[i - 1] });
      i--;
    }
  }

  return diff.reverse();
}
