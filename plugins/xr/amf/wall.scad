$fn=100;
scale([1,1,5])
difference(){
    sphere(r=10);
    sphere(r=9);
    translate([0,0,-100/2])
    cylinder(r=10, h=100, center=true);
}