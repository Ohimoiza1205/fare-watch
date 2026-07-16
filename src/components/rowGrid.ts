// Shared by the server-rendered column header and the client RouteRow so the
// labels line up with the data columns exactly. It lives in a plain module, not
// the client RouteRow, because a server component that imports a value from a
// client module gets a client-reference stub instead of the string.
export const ROW_GRID =
  "grid grid-cols-[3.25rem_3.25rem_9.5rem_10rem_minmax(12rem,1fr)_8.5rem] items-center gap-x-6";
