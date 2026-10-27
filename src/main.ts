import { get_svg } from "./graphics";

const container_element = document.querySelector("#container") as HTMLDivElement;
const character_elements = document.querySelectorAll<HTMLDivElement>(".character");
const question_element = document.querySelector("#question") as HTMLDivElement;
const answer_element = document.querySelector("#answer") as HTMLDivElement;
const pinyin_element = document.querySelector("#pinyin") as HTMLDivElement;
const definition_element = document.querySelector("#definition") as HTMLDivElement;
const options_element = document.querySelector("#options") as HTMLDivElement;

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
    let lines = text.split("\n");
    let vocab: Record<string, string[]> = {};
    let current_category = "main";
    for(let line of lines){
        line = line.trim();
        if(line.startsWith("#")){
            current_category = line.substring(1, line.length).trim();
            vocab[current_category] = [];
        }else if(line != ""){
            vocab[current_category].push(line);
        }
    }
    return vocab;
}

function set_word(word: string){
    const svg = get_svg(word);
    if(svg == undefined){
        console.log("could not find character in word:", word);
        return false;
    }
    
    let definition = dictionary[word];
    if(definition == undefined){
        definition = {
            pinyin: Array.from(word).map(x => dictionary[x].pinyin).filter(x => x !== undefined).join(" "),
            definitions: ["no definition found"]
        }
        if(definition.pinyin == ""){
            console.log("could not find pinyin for word:", word);
            return false;
        }
    }

    for(let element of character_elements){
        element.replaceChildren(svg.cloneNode(true));
    }

    pinyin_element.innerText = render_pinyin(definition.pinyin);
    definition_element.replaceChildren();

    for(let d of definition.definitions){
        let li = document.createElement("li");
        li.innerText = d;
        definition_element.appendChild(li);
    }

    return true;
}

function render_pinyin(pinyin: string){
    let syls = pinyin.split(" ").map(x => x.trim().toLowerCase());
    let rendered = [];
    for(let syl of syls){
        let vowel: string | undefined = undefined;
        let tone = Number(syl[syl.length - 1]);
        if(syl.includes("a")) vowel = "a";
        else if(syl.includes("e")) vowel = "e";
        else if(syl.includes("ou")) vowel = "o";
        else{
            for(let i = syl.length-1; i--; i >= 0){
                if(Object.hasOwn(vowels, syl[i])){
                    vowel = syl[i];
                    break;
                }
            }
        }

        if(tone == 5){
            rendered.push(syl.replace(tone.toString(), ""));
        }else if(vowel !== undefined && !Number.isNaN(tone)){
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
var deck: string[] = Object.values(vocab).flat();
const dictionary = await get_dictionary();
var revealed = false;

function update_deck(){
    let checkboxes = document.querySelectorAll<HTMLInputElement>(".category>input");
    
    deck = [];
    for(let checkbox of checkboxes){
        if(checkbox.checked){
            deck = deck.concat(vocab[checkbox.id]);
        }
    }
}

function next(){
    if(options_element.classList.contains("open")){
        options_element.classList.remove("open");
    }else{
        if(revealed){
            for(let i = 0; i < 10; i++){
                let word = deck[Math.floor(Math.random() * deck.length)];
                if(set_word(word)) break;
            }
            set_revealed(false);
            revealed = false;
        }else{
            set_revealed(true);
            revealed = true;
        }
    }
}

for(let category of Object.keys(vocab)){
    let element = document.createElement("div");
    let checkbox = document.createElement("input");
    let label = document.createElement("label");

    checkbox.addEventListener("change", update_deck);

    element.classList.add("category");
    checkbox.type = "checkbox";
    checkbox.name = category;
    checkbox.id = category;
    checkbox.checked = true;
    label.htmlFor = category;
    label.innerText = category;
    element.appendChild(checkbox);
    element.appendChild(label);
    options_element.appendChild(element);
}
container_element.addEventListener("click", next);
window.addEventListener("keypress", (e) => {
    if(e.key == " "){
        next();
    }
})

options_element.addEventListener("click", () => {
    options_element.classList.add("open");
})

update_deck();

for(let word of deck){
    set_word(word);
}

set_word(deck[0]);
set_revealed(revealed);