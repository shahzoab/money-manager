export function getEntityColorStyle(color: string, border = "1px solid") {
  return {
    background: `${color}33`,
    border: `${border} ${color}`,
  };
}
