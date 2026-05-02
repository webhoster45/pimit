const us = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];
const ls = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"];
const ns = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
const ss = ["!", "\"", "#", "$", "%", "&", "'", "(", ")", "*", "+", ",", "-", ".", "/", ":", ";", "<", "=", ">", "?", "@", "[", "\\", "]", "^", "_", "`", "{", "|", "}", "~"];


function keyG(){
    let key=''
    for(let i=0;i<12;i++){
    let randomupper=us[Math.floor(Math.random()*us.length)];
let randomlower=ls[Math.floor(Math.random()*ls.length)];
let randomnumber=ns[Math.floor(Math.random()*ns.length)];
let randomsymbols=ss[Math.floor(Math.random()*ss.length)];

    key+=randomupper;
    key+=randomlower;
    key+=randomnumber;
    key+=randomsymbols;
    }
    return key
};

console.log(keyG())

