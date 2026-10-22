// Couple color by idx (1-4). Full class names so Tailwind picks them up.
export const coupleBg = ["", "bg-c1", "bg-c2", "bg-c3", "bg-c4"];
export const coupleText = ["", "text-c1", "text-c2", "text-c3", "text-c4"];
export const coupleBorder = ["", "border-c1", "border-c2", "border-c3", "border-c4"];
export const coupleTint = ["", "bg-c1/15", "bg-c2/15", "bg-c3/15", "bg-c4/15"];
export const coupleShadow = ["", "shadow-c1/40", "shadow-c2/40", "shadow-c3/40", "shadow-c4/40"];
export const coupleEmoji = ["", "🔥", "🌊", "⚡", "🍀"];

// Stagger helper for entrance animations.
export const delay = (i: number, step = 70) => ({ animationDelay: `${i * step}ms` });
