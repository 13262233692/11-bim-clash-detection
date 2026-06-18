import { translate, scale, multiply, transformPoint, IDENTITY_MATRIX } from "./shared/matrix";

console.log("=== Matrix Math Test ===");

const s = scale(31, 4, 0.5);
console.log("Scale matrix (31, 4, 0.5):");
console.log(`  col0: ${s[0]}, ${s[1]}, ${s[2]}, ${s[3]}`);
console.log(`  col1: ${s[4]}, ${s[5]}, ${s[6]}, ${s[7]}`);
console.log(`  col2: ${s[8]}, ${s[9]}, ${s[10]}, ${s[11]}`);
console.log(`  col3: ${s[12]}, ${s[13]}, ${s[14]}, ${s[15]}`);

const t = translate(10, 2, -5.25);
console.log("\nTranslate matrix (10, 2, -5.25):");
console.log(`  col0: ${t[0]}, ${t[1]}, ${t[2]}, ${t[3]}`);
console.log(`  col1: ${t[4]}, ${t[5]}, ${t[6]}, ${t[7]}`);
console.log(`  col2: ${t[8]}, ${t[9]}, ${t[10]}, ${t[11]}`);
console.log(`  col3: ${t[12]}, ${t[13]}, ${t[14]}, ${t[15]}`);

const ts = multiply(t, s);
console.log("\nmultiply(T, S) — should be T*S (scale then translate):");
console.log(`  col0: ${ts[0]}, ${ts[1]}, ${ts[2]}, ${ts[3]}`);
console.log(`  col1: ${ts[4]}, ${ts[5]}, ${ts[6]}, ${ts[7]}`);
console.log(`  col2: ${ts[8]}, ${ts[9]}, ${ts[10]}, ${ts[11]}`);
console.log(`  col3: ${ts[12]}, ${ts[13]}, ${ts[14]}, ${ts[15]}`);
console.log("  Expected col3 (translation): 10, 2, -5.25, 1");

const st = multiply(s, t);
console.log("\nmultiply(S, T) — should be S*T (translate then scale):");
console.log(`  col0: ${st[0]}, ${st[1]}, ${st[2]}, ${st[3]}`);
console.log(`  col1: ${st[4]}, ${st[5]}, ${st[6]}, ${st[7]}`);
console.log(`  col2: ${st[8]}, ${st[9]}, ${st[10]}, ${st[11]}`);
console.log(`  col3: ${st[12]}, ${st[13]}, ${st[14]}, ${st[15]}`);
console.log("  Expected col3 (scaled translation): 310, 8, -2.625, 1");

console.log("\n=== Transform Point Test ===");
const point: [number, number, number] = [1, 2, 3];
console.log("Local point:", point);

const tsPoint = transformPoint(ts, point[0], point[1], point[2]);
console.log("T*S * point:", tsPoint);
console.log("  Expected: (1*31 + 10, 2*4 + 2, 3*0.5 + (-5.25)) = (41, 10, -3.75)");

const stPoint = transformPoint(st, point[0], point[1], point[2]);
console.log("S*T * point:", stPoint);
console.log("  Expected: ((1+10)*31, (2+2)*4, (3+(-5.25))*0.5) = (341, 16, -1.125)");

console.log("\n=== Identity Test ===");
const ti = multiply(t, IDENTITY_MATRIX);
console.log("T * I = T? col3:", ti[12], ti[13], ti[14], "(expected: 10, 2, -5.25)");

const it = multiply(IDENTITY_MATRIX, t);
console.log("I * T = T? col3:", it[12], it[13], it[14], "(expected: 10, 2, -5.25)");
