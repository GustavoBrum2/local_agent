export type CompatibilityStatus =
    | 'compatible'
    | 'incompatible'
    | 'compatible_with_warnings'
    | 'insufficient_data';

export type PartCategory =
    | 'cpu'
    | 'motherboard'
    | 'ram'
    | 'gpu'
    | 'ssd'
    | 'hdd'
    | 'psu'
    | 'case'
    | 'cooler';

export type RamType = 'DDR3' | 'DDR4' | 'DDR5';

export type StorageInterface = 'SATA' | 'NVMe';

export type StorageFormFactor = '2.5"' | '3.5"' | 'M.2 2230' | 'M.2 2242' | 'M.2 2260' | 'M.2 2280';

export type MotherboardFormFactor = 'ATX' | 'Micro-ATX' | 'Mini-ITX' | 'E-ATX';

export type PcieGeneration = 3 | 4 | 5;
