
export type LatLng = [number, number];

export function geoToLatLng(points:number[][]):LatLng[] {
  return points.map(([lng,lat]) => [lat,lng]);
}

export function haversine(a:LatLng,b:LatLng){
 const R=6371000;
 const p1=a[0]*Math.PI/180;
 const p2=b[0]*Math.PI/180;
 const dp=(b[0]-a[0])*Math.PI/180;
 const dl=(b[1]-a[1])*Math.PI/180;
 const x=Math.sin(dp/2)**2+
 Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
 return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}

export function bearing(a:LatLng,b:LatLng){
 return Math.atan2(
  Math.sin((b[1]-a[1])*Math.PI/180),
  Math.cos(a[0]*Math.PI/180)*Math.tan(b[0]*Math.PI/180)-
  Math.sin(a[0]*Math.PI/180)*Math.cos((b[1]-a[1])*Math.PI/180)
 )*180/Math.PI;
}
