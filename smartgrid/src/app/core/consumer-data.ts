// No alias; relative import into assets
import household from '../../assets/data/household_private.json';
// If you don't have tariffs.json, set tariffs to null
import tariffs from '../../assets/data/tariffs.json';

export const consumerHousehold: any = household;
export const consumerTariffs: any = tariffs; // or: null