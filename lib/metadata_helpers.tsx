import { Dayjs } from "dayjs";

// Return the list of max equal values
export function getMaxs<T>(
  array: T[],
  comparator: (a: T, b: T) => number
): T[] {
  let _curItems: T[] = [array[0]];

  array.slice(1).forEach((item) => {
    let cmp = comparator(_curItems[0], item);

    if (cmp > 0) {
      _curItems = [item];
    } else if (cmp === 0) {
      _curItems.push(item);
    } else {
      // Do nothing
    }
  });

  return _curItems;
}

export function nullCmp<T>(
  a: T | null,
  b: T | null,
  cmp: (a: T, b: T) => number
) {
  if (a !== null && a !== undefined && b !== null && b !== undefined) {
    return cmp(a, b);
  } else if ((a === null || a === undefined) && b !== null && b !== undefined) {
    return 1;
  } else if (
    (a === null || a === undefined) &&
    (b === null || b === undefined)
  ) {
    return 0;
  } else {
    // if (a !== null && b === null)
    return -1;
  }
}

export function dateCmp(a: Dayjs, b: Dayjs) {
  if (a.isAfter(b)) {
    return -1;
  } else if (a.isSame(b)) {
    return 0;
  } else {
    return 1;
  }
}
