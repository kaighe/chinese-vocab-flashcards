import { get_svg } from "./graphics";

const character_elements = document.querySelectorAll<HTMLDivElement>(".character");
const question_element = document.querySelector("#question") as HTMLDivElement;
const answer_element = document.querySelector("#answer") as HTMLDivElement;
const pinyin_element = document.querySelector("#pinyin") as HTMLDivElement;
const definition_element = document.querySelector("#definition") as HTMLDivElement;

const vowels = {
    "a": ["ā", "á", "à", "ă", "a"],
    "e": ["ē", "é", "ĕ", "è", "e"],
    "i": ["ī", "í", "ĭ", "ì", "i"],
    "o": ["ō", "ó", "ŏ", "ò", "o"],
    "u": ["ū", "ú", "ŭ", "ù", "u"],
    "v": ["ǖ", "ǘ", "ǚ", "ǜ", "ü"],
}

async function get_dictionary(){
    const r = await fetch("/dictionary.json");
    return await r.json();
}

async function get_vocab(){
    const r = await fetch("/vocab.txt");
    const text = await r.text();
    let words = text.split("\n");
    words = words.map(x => x.trim()).filter(x => x !== "" && !x.startsWith("#"));
    return words;
}

function set_word(word: string){
    const svg = get_svg(word);
    if(svg == undefined) return false;
    
    const definition = dictionary[word];
    if(definition == undefined) return false;

    for(let element of character_elements){
        element.replaceChildren(svg.cloneNode(true));
    }

    pinyin_element.innerText = render_pinyin(definition.pinyin);
    definition_element.innerText = definition.definitions[0]

    return true;
}

function render_pinyin(pinyin: string){
    let syls = pinyin.split(" ").map(x => x.trim().toLowerCase());
    let rendered = [];
    for(let syl of syls){
        let vowel: string | undefined = undefined;
        let tone = Number(syl[syl.length - 1]);
        if(syl.includes("a")) vowel = "a";
        if(syl.includes("e")) vowel = "e";
        if(syl.includes("ou")) vowel = "o";
        else{
            for(let i = syl.length-1; i--; i >= 0){
                if(Object.hasOwn(vowels, syl[i])){
                    vowel = syl[i];
                    break;
                }
            }
        }
        
        if(vowel !== undefined && !Number.isNaN(tone)){
            rendered.push(syl.replace(vowel, (vowels as any)[vowel][tone-1]).replace(tone.toString(), ""));
        }else{
            console.log("failed to render pinyin sylible: " + pinyin);
            rendered.push(syl);
        }
    }

    return rendered.join(" ");
}

function set_revealed(revealed: boolean){
    if(revealed){
        question_element.classList.add("hidden");
        answer_element.classList.remove("hidden");
    }else{
        question_element.classList.remove("hidden");
        answer_element.classList.add("hidden");
    }
}

const vocab = await get_vocab();
const dictionary = await get_dictionary();

var revealed = false;
window.addEventListener("click", () => {
    if(revealed){
        set_word(vocab[Math.floor(Math.random() * vocab.length)]);
        set_revealed(false);
        revealed = false;
    }else{
        set_revealed(true);
        revealed = true;
    }
})

set_word(vocab[0]);
set_revealed(revealed);

for(let word of vocab){
    set_word(word);
}

console.log(vocab)