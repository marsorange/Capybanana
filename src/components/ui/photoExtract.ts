export interface Extracted {
  color: string;
  hint: string;
  keyword: string;
}

const toHex = (v: number) => Math.round(v).toString(16).padStart(2, "0");

// Lightweight stand-in for real object recognition: read the average color of
// the photo and map it to a travel "element". (Future: iOS object-cutout.)
export function extractElement(data: Uint8ClampedArray): Extracted {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    n += 1;
  }
  if (n > 0) {
    r /= n;
    g /= n;
    b /= n;
  }
  const color = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  const bright = (r + g + b) / 3;

  let hint = "说不清的颜色";
  let keyword = "";
  if (bright < 65) {
    hint = "夜色般的暗调";
    keyword = "夜晚";
  } else if (b > r + 15 && b > g + 10) {
    hint = "海一样的蓝";
    keyword = "海";
  } else if (g > r + 10 && g > b + 5) {
    hint = "草木的绿";
    keyword = "森林";
  } else if (r > 160 && g > 110 && b < 110) {
    hint = "暖暖的橘";
    keyword = "温泉";
  } else if (r > 170 && b > 150 && g < 160) {
    hint = "花一样的粉";
    keyword = "花";
  } else if (Math.abs(r - g) < 22 && Math.abs(g - b) < 22 && bright > 120) {
    hint = "灰白的城";
    keyword = "雨";
  }
  return { color, hint, keyword };
}
