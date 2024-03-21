// vector.ts - a vector library, primarily defining a class.

// A helper function for the direct array-to-array dot product; this gets used
// for both the actual dot product as well as for matrix-vector products.
function arrayDot(first: Array<number>, second: Array<number>): number {
  return first.reduce((prev, v, idx) => prev+v*second[idx], 0);
}

export const LENGTH_EPSILON = 0.000001;

export class Vector2 {
  data: [number, number];

  constructor(first?: number | Array<number>, second?: number) {
    this.data = [NaN, NaN];
    if (first == undefined) {
      this.data = [0, 0];
    } else if (Array.isArray(first)) {
      this.data = [first[0], first[1]];
    } else if (second != undefined) {
      this.data = [first as number, second as number];
    }
    else {
      throw new Error("Invalid arguments to Vector2 constructor!");
    }
  }

  public toString(): String {
    return `[${this.data[0]}, ${this.data[1]}]`;
  }

  public static Clone(v: Vector2): Vector2 {
    return new Vector2(v.data);
  }

  public clone(): Vector2 {
    return Vector2.Clone(this);
  }

  // returns this for chaining purposes
  public substitute(
    first: number | undefined | Array<number | undefined>,
    second: number | undefined): Vector2 {
    let scalarFirst: number | undefined = undefined;
    let scalarSecond: number | undefined = undefined;
    if (Array.isArray(first)) {
      scalarFirst = first[0];
      scalarSecond = first[1];
    } else {
      scalarFirst = first;
      scalarSecond = second;
    }
    if (scalarFirst !== undefined) {
      this.data[0] = scalarFirst;
    }
    if (scalarSecond !== undefined) {
      this.data[1] = scalarSecond;
    }
    return this;
  }

  public static Substitute(
    v: Vector2,
    first: number | undefined | Array<number | undefined>,
    second: number | undefined): Vector2 {
    let vOut = v.clone();
    return vOut.substitute(first, second);
  }

  public static Add(v1: Vector2, v2: Vector2): Vector2 {
    return new Vector2(v1.data.map((v, idx) => v+v2.data[idx]));
  }

  // returns this for chaining purposes
  public add(v: Vector2): Vector2 {
      this.data.forEach((_, idx) => this.data[idx] += v.data[idx]);
      return this;
  }

  public static Subtract(v1: Vector2, v2: Vector2): Vector2 {
    return new Vector2(v1.data.map((v, idx) => v-v2.data[idx]));
  }

  // returns this for chaining purposes
  public subtract(v: Vector2): Vector2 {
    this.data.forEach((_, idx) => this.data[idx] -= v.data[idx]);
    return this;
  }

  public static ScalarMult(v: Vector2, n: number): Vector2 {
    return new Vector2(v.data.map(v => v*n));
  }

  // returns this for chaining purposes
  public scalarMult(n: number): Vector2 {
    this.data.forEach((_, idx) => this.data[idx] *= n);
    return this;
  }

  public static Dot(v1: Vector2, v2: Vector2): number {
    return arrayDot(v1.data, v2.data);
  }

  public dot(v: Vector2): number {
    return Vector2.Dot(this, v);
  }

  public static Cross(v1: Vector2, v2: Vector2): number {
    let d1 = v1.data; let d2 = v2.data;
    return d1[0]*d2[1]-d1[1]*d2[0];
  }

  public cross(v: Vector2): number {
    return Vector2.Cross(this, v);
  }

  public static LengthSq(v: Vector2): number {
    return v.lengthSq();
  }

  public lengthSq(): number {
    return this.dot(this);
  }

  public static Length(v: Vector2): number {
    return v.length();
  }

  public length(): number {
    return Math.sqrt(this.lengthSq());
  }

  public static Normalize(v: Vector2) {
    let v2 = v.clone();
    v2.normalize();
    return v2;
  }

  // returns this for chaining purposes
  public normalize() {
    let len = this.length();
    let inverseLen = (len > LENGTH_EPSILON? 1.0/len: 1.0);
    return this.scalarMult(inverseLen);
  }

  public perpendicular(): Vector2 {
    return new Vector2(this.data[1], -this.data[0]);
  }

  public static Perpendicular(v: Vector2): Vector2 {
    return v.perpendicular();
  }

  // Assumes that first and second are (a) normalized, and (b) flat (i.e. z=0)
  public static AngleBetween(first: Vector2, second: Vector2): number {
    let firstSecondDot: number = Vector2.Dot(first, second);
    let firstSecondCross: number = Vector2.Cross(first, second);
    let angle = Math.atan2(firstSecondCross, firstSecondDot);
    return (angle<0)? 2*Math.PI+angle: angle;
  }

  // Assumes that v is flat and angle is in radians
  public static Rotate(v: Vector2, angle: number): Vector2 {
    return new Vector2(
      v.data[0]*Math.cos(angle) - v.data[1]*Math.sin(angle),
      v.data[0]*Math.sin(angle) + v.data[1]*Math.cos(angle)
    );
  }

  public static Interpolate(v0: Vector2, v1: Vector2, t: number): Vector2 {
    return Vector2.ScalarMult(v0, 1-t).add(Vector2.ScalarMult(v1, t));
  }
}
