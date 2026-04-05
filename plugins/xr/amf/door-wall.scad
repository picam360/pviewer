size=10;
translate([0,-size/2,0])
difference(){
    cube([size+0.01,size+0.01,size+0.01], center=true);
    cube([size,size,size], center=true);
    translate([0,100/2,0])
    cube([2,100,2], center=true);
}
