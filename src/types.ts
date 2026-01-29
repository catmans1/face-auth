export type Point = {
  x: number;
  y: number;
};

export type Box = {
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
};

export type Face = {
  box: Box;
  landmarks?: Point[];
};

export type Shape = {
  width: number;
  height: number;
};

export type Config = {
  detectorType: string;
  selfieMode: boolean;
  checkFaceMargin: number;
  checkFaceMinSize: number;
  checkFaceMaxSize: number;
  checkMultiFaceAreaRatio: number;
};
