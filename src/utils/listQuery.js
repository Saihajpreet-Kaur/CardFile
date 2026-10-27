const isEmpty = (value) => value === undefined || value === null || value === '';

const compareValues = (a, b) => {
  if (typeof a === 'string' && typeof b === 'string') {
    return a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true });
  }
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
};

/** sort = "firstName" (ascending) or "-createdAt" (descending). Empty values always go last. */
export function sortRecords(records, sort) {
  const direction = sort.startsWith('-') ? -1 : 1;
  const field = sort.replace(/^-/, '');

  return [...records].sort((a, b) => {
    const left = a[field];
    const right = b[field];

    if (isEmpty(left) || isEmpty(right)) return Number(isEmpty(left)) - Number(isEmpty(right));
    return compareValues(left, right) * direction;
  });
}

/** Works like skip/limit: skip = (page - 1) * limit. */
export function paginate(records, { page, limit }) {
  const total = records.length;
  const totalPages = Math.max(Math.ceil(total / limit), 1);
  const skip = (page - 1) * limit;

  return {
    items: records.slice(skip, skip + limit),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}
