/**
 * The exterior render's description, with the plan's facts first.
 * The AI writes the image description freely and often drops the storeys
 * (a duplex drawn as a bungalow); the image model follows what comes first,
 * so the number of storeys, the building's size and its balconies lead.
 */
const STOREY_WORDS = ['', 'single-storey', 'two-storey', 'three-storey', 'four-storey', 'five-storey', 'six-storey'];

export function renderPrompt(design: any, aiPrompt: string): string {
    const rooms: any[] = design?.rooms ?? [];
    const floorsInRooms = rooms.reduce((m, r) => Math.max(m, Number(r.floor ?? r.target_floor ?? 0) + 1), 1);
    const storeys = Math.max(Number(design?.brief_reference?.floors ?? design?.brief_reference?.storeys ?? 1) || 1, floorsInRooms);
    const word = STOREY_WORDS[storeys] ?? `${storeys}-storey`;
    const facts: string[] = [];
    facts.push(storeys === 1
        ? 'A single-storey building: exactly one level, no upper floor'
        : `A ${word} building: exactly ${storeys} levels (${['ground floor', 'first floor', 'second floor', 'third floor', 'fourth floor', 'fifth floor'].slice(0, storeys).join(', ')}), no more`);
    const L = design?.solvedLayout;
    if (L?.building_width && L?.building_depth && !(L.solver_status === 'UNSAT' || L.solver_status === 'TIMEOUT'))
        facts.push(`about ${Math.round(L.building_width)} m wide and ${Math.round(L.building_depth)} m deep`);
    const upperBalconies = rooms.filter(r => Number(r.floor ?? 0) > 0 && /balcon|terrace/i.test(`${r.type} ${r.name}`)).length;
    if (upperBalconies) facts.push(`${upperBalconies === 1 ? 'a balcony' : 'balconies'} on the upper floor${storeys > 2 ? 's' : ''}`);
    const outbuildings = (L?.outbuildings ?? []).map((b: any) => b.label).filter(Boolean);
    if (outbuildings.length) facts.push(`a separate small ${outbuildings.join(' and ')} behind it`);
    return `${facts.join(', ')}. ${aiPrompt}`;
}
