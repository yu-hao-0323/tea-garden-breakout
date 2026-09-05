export function floatingStick(center,point,radius,bounds){
 let dx=point.x-center.x,dy=point.y-center.y,distance=Math.hypot(dx,dy);
 if(distance>radius){const excess=1-radius/distance;center={x:Math.max(bounds.left,Math.min(bounds.right,center.x+dx*excess)),y:Math.max(bounds.top,Math.min(bounds.bottom,center.y+dy*excess))};}
 dx=point.x-center.x;dy=point.y-center.y;distance=Math.hypot(dx,dy);
 const scale=distance>radius?radius/distance:1;
 return {center,x:dx*scale/radius,y:dy*scale/radius};
}
