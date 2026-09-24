/** „2026-09-24” → „24 septembrie 2026” */
export function dataLunga(iso: string): string {
  const [an, luna, zi] = iso.split("-").map(Number);
  const luni = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];
  return `${zi} ${luni[luna - 1]} ${an}`;
}
