import { Vector2 } from './vector.ts';

export class Polygon {
  vertices: Array<Vector2>;

  constructor(verts: Array<Vector2>) {
    this.vertices = verts;
  }

  public centerOfMass(): Vector2 {
    let sum = this.vertices.reduce(
      (prev, cur) => prev.add(cur),
      new Vector2()
    );
    return sum.scalarMult(1/this.vertices.length);
  }

  public area(): number {
    return this.vertices.map((vert, idx, vertArr) => {
      let secondVert = vertArr[(idx+1)%(vertArr.length)];
      let delta0 = Vector2.Subtract(vert, vertArr[0]);
      let delta1 = Vector2.Subtract(secondVert, vertArr[0]);
      return Vector2.Cross(delta0, delta1)/2;
    }).reduce((prev, cur) => prev+cur);
  }
}