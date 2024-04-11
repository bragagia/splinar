# Update tests

## Item creation / restored

- Should appear created in Splinar
  [v] Creation (Poll)
  [v] Restored (Poll)

- Should be marked as not similarity checked and dup_checked
  [v] Creation
  [v] Restored

  // - Should be similarity checked
  // - Should be added to a dupstack if needed

## Item modification

- Modification must appear in Splinar

- Should be marked as not similarity checked and dup_checked
  [v] Modification

  // - Should stay "sim checked" if no field concerned by dup rules has been modified
  // - Should be similarity checked if needed
  // - Should be added to a dupstack if needed
  // - Existing dupstack should be recalculated

## Item deletion / merge / privacy deletion

- Item should disapear from Splinar
  [v] Deletion
  [v] Merge
  [v] Privacy

- If a request on this item is made on splinar before the deletion is replicated, it should not block another process
  [] Deletion
  [] Merge
  [] Privacy

- If item is in a dupstack, it should disappear. If the dusptack is left empty, it should disappear too
  [v] Deletion
  [v] Merge
  [v] Privacy
