const OZ_TO_ML = 29.5735;
const LB_TO_KG = 0.453592;

export function displayVolume(oz, unitSystem) {
  if (unitSystem === 'metric') {
    return { value: Math.round(oz * OZ_TO_ML), unit: 'mL' };
  }
  return { value: oz, unit: 'oz' };
}

export function displayWeight(lb, unitSystem) {
  if (unitSystem === 'metric') {
    return { value: Math.round(lb * LB_TO_KG * 10) / 10, unit: 'kg' };
  }
  return { value: lb, unit: 'lb' };
}

export function volumeIncrement(unitSystem) {
  // Tap adds 8oz or ~250mL
  return unitSystem === 'metric' ? 250 : 8;
}

export function volumeToOz(value, unitSystem) {
  if (unitSystem === 'metric') {
    return Math.round(value / OZ_TO_ML);
  }
  return value;
}

export function weightToLb(value, unitSystem) {
  if (unitSystem === 'metric') {
    return Math.round(value / LB_TO_KG * 10) / 10;
  }
  return value;
}

export function formatVolume(oz, unitSystem) {
  const d = displayVolume(oz, unitSystem);
  return `${d.value} ${d.unit}`;
}

export function formatWeight(lb, unitSystem) {
  const d = displayWeight(lb, unitSystem);
  return `${d.value} ${d.unit}`;
}
