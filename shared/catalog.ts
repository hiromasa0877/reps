// Exercise catalog shared by the Worker (AI prompt, part lookup) and the app (picker, form guide).

export type Part = "chest" | "back" | "legs" | "shoulders" | "arms" | "abs";
export const PARTS: { id: Part; label: string; color: string }[] = [
  { id: "chest", label: "胸", color: "#ff6b6b" },
  { id: "back", label: "背中", color: "#4d8dff" },
  { id: "legs", label: "脚", color: "#22c55e" },
  { id: "shoulders", label: "肩", color: "#ff9500" },
  { id: "arms", label: "腕", color: "#a855f7" },
  { id: "abs", label: "腹", color: "#eab308" },
];
export const PART_IDS = PARTS.map((p) => p.id);

/** Animation archetype used by the form diagram. */
export type Motion =
  | "bench" | "pushup" | "fly" | "deadlift" | "pullup" | "row" | "squat" | "lunge" | "calf" | "bridge"
  | "ohp" | "lateral" | "frontraise" | "curl" | "pushdown" | "crunch" | "plank" | "legraise";
export type Equipment = "barbell" | "dumbbell" | "cable" | "none";

export type Exercise = {
  name: string;
  part: Part;
  motion: Motion;
  equipment: Equipment;
  sets: number;
  reps: number;
  weight: number;
  /** Labels for the two phases of the movement (start→end, end→start). */
  phases: [string, string];
  tips: string[];
};

export const CATALOG: Exercise[] = [
  // ---- chest ----
  { name: "ベンチプレス", part: "chest", motion: "bench", equipment: "barbell", sets: 3, reps: 10, weight: 40, phases: ["下ろす（吸う）", "押し上げる（吐く）"],
    tips: ["肩甲骨を寄せて下げ、胸を張る", "バーは乳首のライン付近に下ろす", "手首は立てて前腕を垂直に", "足裏で床を踏み、お尻は浮かせない"] },
  { name: "ダンベルプレス", part: "chest", motion: "bench", equipment: "dumbbell", sets: 3, reps: 10, weight: 14, phases: ["下ろす（吸う）", "押し上げる（吐く）"],
    tips: ["肩甲骨を寄せたまま胸を張る", "肘は体から45°ほど開く", "下ろす時は胸がストレッチされるまで", "上でダンベル同士をぶつけない"] },
  { name: "インクラインベンチプレス", part: "chest", motion: "bench", equipment: "barbell", sets: 3, reps: 10, weight: 30, phases: ["下ろす（吸う）", "押し上げる（吐く）"],
    tips: ["ベンチ角度は30〜45°", "鎖骨の少し下に下ろす", "肩がすくまないよう肩甲骨を下げる"] },
  { name: "ダンベルフライ", part: "chest", motion: "fly", equipment: "dumbbell", sets: 3, reps: 12, weight: 8, phases: ["開く（吸う）", "閉じる（吐く）"],
    tips: ["肘は軽く曲げた角度で固定", "胸のストレッチを感じる位置まで開く", "抱きかかえるように弧を描いて閉じる"] },
  { name: "腕立て伏せ", part: "chest", motion: "pushup", equipment: "none", sets: 3, reps: 15, weight: 0, phases: ["下ろす（吸う）", "押す（吐く）"],
    tips: ["頭からかかとまで一直線", "手は肩幅よりやや広く", "胸が床に近づくまで下ろす", "腰を反らせない・落とさない"] },

  // ---- back ----
  { name: "デッドリフト", part: "back", motion: "deadlift", equipment: "barbell", sets: 3, reps: 8, weight: 60, phases: ["引き上げる（吐く）", "下ろす（吸う）"],
    tips: ["背中は丸めず常にまっすぐ", "バーはすねに沿わせて体の近くを通す", "お尻と肩を同時に上げる", "トップで腰を反らしすぎない"] },
  { name: "懸垂", part: "back", motion: "pullup", equipment: "none", sets: 3, reps: 8, weight: 0, phases: ["引き上げる（吐く）", "下ろす（吸う）"],
    tips: ["肩甲骨を下げてから引き始める", "胸をバーに近づけるイメージ", "反動を使わずゆっくり下ろす"] },
  { name: "ラットプルダウン", part: "back", motion: "pullup", equipment: "cable", sets: 3, reps: 12, weight: 35, phases: ["引く（吐く）", "戻す（吸う）"],
    tips: ["胸を張り、バーを鎖骨に向けて引く", "肘を下・後ろに引く意識", "上体を反らしすぎない"] },
  { name: "ベントオーバーロウ", part: "back", motion: "row", equipment: "barbell", sets: 3, reps: 10, weight: 40, phases: ["引く（吐く）", "下ろす（吸う）"],
    tips: ["上体は45°前傾、背中はフラット", "バーをおへそに向けて引く", "肩甲骨を寄せ切る"] },
  { name: "ダンベルロウ", part: "back", motion: "row", equipment: "dumbbell", sets: 3, reps: 10, weight: 16, phases: ["引く（吐く）", "下ろす（吸う）"],
    tips: ["背中はまっすぐ、骨盤を正面に", "肘を腰に向かって引く", "体をひねって引かない"] },

  // ---- legs ----
  { name: "スクワット", part: "legs", motion: "squat", equipment: "barbell", sets: 3, reps: 10, weight: 50, phases: ["しゃがむ（吸う）", "立ち上がる（吐く）"],
    tips: ["足は肩幅、つま先はやや外向き", "膝はつま先と同じ方向へ", "太ももが床と平行まで下ろす", "背中を丸めず胸を張る"] },
  { name: "自重スクワット", part: "legs", motion: "squat", equipment: "none", sets: 3, reps: 20, weight: 0, phases: ["しゃがむ（吸う）", "立ち上がる（吐く）"],
    tips: ["お尻を後ろに引くように下ろす", "かかとに体重を乗せる", "膝が内側に入らないように"] },
  { name: "ブルガリアンスクワット", part: "legs", motion: "lunge", equipment: "dumbbell", sets: 3, reps: 10, weight: 8, phases: ["沈む（吸う）", "立ち上がる（吐く）"],
    tips: ["後ろ足はベンチに乗せる", "前足のかかとで押し上げる", "上体はやや前傾でOK"] },
  { name: "ランジ", part: "legs", motion: "lunge", equipment: "none", sets: 3, reps: 12, weight: 0, phases: ["踏み込む（吸う）", "戻る（吐く）"],
    tips: ["大きく一歩踏み出す", "前膝は90°、つま先より前に出しすぎない", "上体はまっすぐ"] },
  { name: "ルーマニアンデッドリフト", part: "legs", motion: "deadlift", equipment: "barbell", sets: 3, reps: 10, weight: 40, phases: ["持ち上げる（吐く）", "下ろす（吸う）"],
    tips: ["膝は軽く曲げて固定", "お尻を後ろに引いて前傾", "もも裏のストレッチを感じる"] },
  { name: "ヒップスラスト", part: "legs", motion: "bridge", equipment: "barbell", sets: 3, reps: 12, weight: 40, phases: ["持ち上げる（吐く）", "下ろす（吸う）"],
    tips: ["トップでお尻を強く締める", "腰を反らさず骨盤を後傾", "すねがトップで垂直になる足幅"] },
  { name: "カーフレイズ", part: "legs", motion: "calf", equipment: "none", sets: 3, reps: 20, weight: 0, phases: ["上げる（吐く）", "下ろす（吸う）"],
    tips: ["つま先立ちで1秒キープ", "かかとはゆっくり下ろす", "膝は伸ばしたまま"] },

  // ---- shoulders ----
  { name: "ショルダープレス", part: "shoulders", motion: "ohp", equipment: "dumbbell", sets: 3, reps: 10, weight: 10, phases: ["押し上げる（吐く）", "下ろす（吸う）"],
    tips: ["腰を反らさず腹圧をかける", "耳の横まで下ろす", "真上に押し上げる"] },
  { name: "オーバーヘッドプレス", part: "shoulders", motion: "ohp", equipment: "barbell", sets: 3, reps: 8, weight: 30, phases: ["押し上げる（吐く）", "下ろす（吸う）"],
    tips: ["お尻と腹を締めて体幹を固定", "顔を少し引いてバーを通す", "トップで頭をバーの下に入れる"] },
  { name: "サイドレイズ", part: "shoulders", motion: "lateral", equipment: "dumbbell", sets: 3, reps: 15, weight: 5, phases: ["上げる（吐く）", "下ろす（吸う）"],
    tips: ["肩の高さまで上げる", "肘から上げるイメージ", "肩をすくめない", "反動を使わない"] },
  { name: "フロントレイズ", part: "shoulders", motion: "frontraise", equipment: "dumbbell", sets: 3, reps: 12, weight: 5, phases: ["上げる（吐く）", "下ろす（吸う）"],
    tips: ["肩の高さまで上げる", "体を反らさない", "ゆっくり下ろす"] },

  // ---- arms ----
  { name: "バーベルカール", part: "arms", motion: "curl", equipment: "barbell", sets: 3, reps: 10, weight: 20, phases: ["巻き上げる（吐く）", "下ろす（吸う）"],
    tips: ["肘の位置を体側で固定", "反動を使わない", "下ろす時もゆっくり"] },
  { name: "ダンベルカール", part: "arms", motion: "curl", equipment: "dumbbell", sets: 3, reps: 12, weight: 8, phases: ["巻き上げる（吐く）", "下ろす（吸う）"],
    tips: ["肘を固定し前に出さない", "小指側を上にひねると効く", "下で腕を伸ばし切る"] },
  { name: "ハンマーカール", part: "arms", motion: "curl", equipment: "dumbbell", sets: 3, reps: 12, weight: 8, phases: ["巻き上げる（吐く）", "下ろす（吸う）"],
    tips: ["手のひらを向かい合わせて持つ", "肘を体側で固定", "手首を曲げない"] },
  { name: "トライセプスプッシュダウン", part: "arms", motion: "pushdown", equipment: "cable", sets: 3, reps: 12, weight: 20, phases: ["押し下げる（吐く）", "戻す（吸う）"],
    tips: ["肘を体側に固定", "腕を伸ばし切って二の腕を締める", "上体を前に倒しすぎない"] },

  // ---- abs ----
  { name: "クランチ", part: "abs", motion: "crunch", equipment: "none", sets: 3, reps: 20, weight: 0, phases: ["丸める（吐く）", "戻す（吸う）"],
    tips: ["おへそを覗き込むように背中を丸める", "首を手で引っ張らない", "腰は床につけたまま"] },
  { name: "プランク", part: "abs", motion: "plank", equipment: "none", sets: 3, reps: 60, weight: 0, phases: ["キープ（呼吸は止めない）", "キープ"],
    tips: ["肘は肩の真下", "頭からかかとまで一直線", "お尻を上げすぎ・下げすぎない", "回数欄は秒数として使う"] },
  { name: "レッグレイズ", part: "abs", motion: "legraise", equipment: "none", sets: 3, reps: 15, weight: 0, phases: ["上げる（吐く）", "下ろす（吸う）"],
    tips: ["腰を床に押しつける", "脚はゆっくり下ろし床につけない", "反動を使わない"] },
];

const norm = (s: string) => s.replace(/[\s・（）()]/g, "").toLowerCase();

/** Exact match first, then the longest catalog name contained in (or containing) the input. */
export function findExercise(name: string): Exercise | undefined {
  const n = norm(name);
  if (!n) return undefined;
  const exact = CATALOG.find((e) => norm(e.name) === n);
  if (exact) return exact;
  return [...CATALOG]
    .sort((a, b) => b.name.length - a.name.length)
    .find((e) => n.includes(norm(e.name)) || norm(e.name).includes(n));
}
