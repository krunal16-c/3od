export const manufacturingProcesses = [
  '3d_printing',
  'cnc_milling',
  'cnc_turning',
  'laser_cutting',
  'fabrication',
  'waterjet_cutting',
  'vacuum_forming',
  'injection_molding',
] as const;

export type ManufacturingProcess = (typeof manufacturingProcesses)[number];
export type ManufacturingProcessAvailability = 'enabled' | 'coming_next' | 'planned';

export interface ManufacturingProcessDefinition {
  id: ManufacturingProcess;
  label: string;
  availability: ManufacturingProcessAvailability;
  requiredFields: readonly ('material' | 'tolerance')[];
}

export const manufacturingProcessCatalog: readonly ManufacturingProcessDefinition[] = [
  { id: '3d_printing', label: '3D printing', availability: 'enabled', requiredFields: [] },
  { id: 'cnc_milling', label: 'CNC milling', availability: 'coming_next', requiredFields: ['material', 'tolerance'] },
  { id: 'cnc_turning', label: 'CNC turning', availability: 'coming_next', requiredFields: ['material', 'tolerance'] },
  { id: 'laser_cutting', label: 'Laser cutting and engraving', availability: 'coming_next', requiredFields: ['material'] },
  { id: 'fabrication', label: 'Sheet-metal fabrication', availability: 'coming_next', requiredFields: ['material', 'tolerance'] },
  { id: 'waterjet_cutting', label: 'Waterjet cutting', availability: 'planned', requiredFields: ['material', 'tolerance'] },
  { id: 'vacuum_forming', label: 'Vacuum forming', availability: 'planned', requiredFields: ['material'] },
  { id: 'injection_molding', label: 'Injection molding', availability: 'planned', requiredFields: ['material', 'tolerance'] },
];

const processById = new Map(manufacturingProcessCatalog.map((process) => [process.id, process]));

export function getManufacturingProcess(process: string): ManufacturingProcessDefinition | null {
  return processById.get(process as ManufacturingProcess) ?? null;
}

export function isEnabledManufacturingProcess(process: string): process is ManufacturingProcess {
  return getManufacturingProcess(process)?.availability === 'enabled';
}

export function validateManufacturingRequest(input: {
  process: string;
  material?: string | null;
  tolerance?: string | null;
}): { ok: true } | { ok: false; code: 'PROCESS_NOT_AVAILABLE' | 'PROCESS_REQUIREMENT_MISSING'; message: string } {
  const definition = getManufacturingProcess(input.process);
  if (!definition || definition.availability !== 'enabled') {
    return { ok: false, code: 'PROCESS_NOT_AVAILABLE', message: 'This manufacturing process is not available yet.' };
  }

  const missing = definition.requiredFields.filter((field) => !input[field]?.trim());
  if (missing.length > 0) {
    return { ok: false, code: 'PROCESS_REQUIREMENT_MISSING', message: `Add ${missing.join(' and ')} for this manufacturing process.` };
  }
  return { ok: true };
}

export function hasEnabledCapability(processes: readonly string[]): boolean {
  return processes.some((process) => isEnabledManufacturingProcess(process));
}

export function canVendorQuoteProcess(processes: readonly string[], process: string): boolean {
  return isEnabledManufacturingProcess(process) && processes.includes(process);
}
