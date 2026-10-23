const r = await fetch("/graphics.json");
const graphics = await r.json();

export function get_svg(word: string){
    let groups = [];
    for(let c = 0; c < word.length; c++){
        const character = word[c];
        if(graphics[character] == undefined){
            return undefined;
        }

        let paths = [];
        for(let stroke of graphics[character].strokes){
            paths.push(`<path d="${stroke}"/>`);
        }
        groups.push(`<g transform="scale(1, -1) translate(${1024*c}, -900)">${paths.join("")}</g>`);
    }

    let template = document.createElement("template");
    template.innerHTML = `<svg version="1.1" viewBox="0 0 ${word.length*1024} 1024" xmlns="http://www.w3.org/2000/svg">${groups.join("")}</svg>`;

    return template.content.firstChild as HTMLElement;
}