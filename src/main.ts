import { get_svg } from "./graphics";

const container_element = document.querySelector("#container") as HTMLDivElement;
const character_elements = document.querySelectorAll<HTMLDivElement>(".character");
const question_element = document.querySelector("#question") as HTMLDivElement;
const answer_element = document.querySelector("#answer") as HTMLDivElement;
const pinyin_element = document.querySelector("#pinyin") as HTMLDivElement;
const definition_element = document.querySelector("#definition") as HTMLDivElement;
const options_element = document.querySelector("#options") as HTMLDivElement;
const categories_element = document.querySelector("#categories-container") as HTMLDivElement;
const back_element = document.querySelector("#back") as HTMLDivElement;
const confidence_element = document.querySelector("#confidence") as HTMLFormElement;

const vowels = {
    "a": ["ā", "á", "ǎ", "à", "a"],
    "e": ["ē", "é", "ě", "è", "e"],
    "i": ["ī", "í", "ǐ", "ì", "i"],
    "o": ["ō", "ó", "ǒ", "ò", "o"],
    "u": ["ū", "ú", "ǔ", "ù", "u"],
    "v": ["ǖ", "ǘ", "ǚ", "ǜ", "ü"],
}

const history_length = 20;

var confidences: Record<string, number> = {}
var current_word = "";
var history: string[] = [];
var forwards_history: string[] = [];

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

    current_word = word;
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

        confidence_element.classList.add("open");
        if(Object.hasOwn(confidences, current_word)){
            (confidence_element.elements.namedItem("rating") as RadioNodeList).value = confidences[current_word].toString();
        }else{
            (confidence_element.elements.namedItem("rating") as RadioNodeList).value = "0";
        }
    }else{
        confidence_element.classList.remove("open");
        question_element.classList.remove("hidden");
        answer_element.classList.add("hidden");
    }
}

const vocab = await get_vocab();
var deck: string[] = Object.values(vocab).flat();
const dictionary = await get_dictionary();
var revealed = false;
var time = 0;
var last_seen: Record<string, number> = {};

function update_deck(){
    let checkboxes = document.querySelectorAll<HTMLInputElement>(".category>input");
    
    deck = [];
    time = 0;
    last_seen = {};
    for(let checkbox of checkboxes){
        if(checkbox.checked){
            deck = deck.concat(vocab[checkbox.id]);
        }
    }
}

function word_weight(word: string): number {
    const P = 1.5;
    const N = deck.length
    const E = 0.05;
    const S = 2;

    const c = Object.hasOwn(confidences, word) ? confidences[word] : 0;
    const t = time - (Object.hasOwn(last_seen, word) ? last_seen[word] : 0);
    const M = 2**(-c/0.7);
    return M * (S*t/N + E)**P;
}

function next(){
    if(options_element.classList.contains("open")){
        options_element.classList.remove("open");
    }else{
        if(revealed){
            for(let i = 0; i < 10; i++){
                let word = deck[0];
                let forward = forwards_history.pop()

                if(forward){
                    word = forward;
                }else{
                    let weights = deck.map(x => word_weight(x));
                    let total_weight = weights.reduce((sum, weight) => sum + weight, 0);

                    let random_target = Math.random() * total_weight;
                    for(let i = 0; i < weights.length; i++){
                        random_target -= weights[i];
                        if(random_target <= 0){
                            word = deck[i];
                            break;
                        }
                    }
                }

                let last_word = current_word;
                if(set_word(word)){
                    last_seen[word] = time;
                    time += 1;

                    if(last_word != "") history.push(last_word);
                    if(history.length > history_length) history = history.slice(history.length - history_length);

                    break;
                };
            }
            set_revealed(false);
            revealed = false;
        }else{
            set_revealed(true);
            revealed = true;
        }
    }
}

function prev(){
    let last = history.pop();
    if(last){
        if(current_word != "") forwards_history.push(current_word);
        if(forwards_history.length > history_length) forwards_history = forwards_history.slice(forwards_history.length - history_length);

        set_word(last);
        set_revealed(true);
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
    categories_element.appendChild(element);
}
container_element.addEventListener("click", next);
window.addEventListener("keydown", (e) => {
    if(e.code == "Space"){
        next();
    }else if(e.code == "Backspace"){
        prev();
    }
})

options_element.addEventListener("click", () => {
    options_element.classList.add("open");
})

back_element.addEventListener("click", prev);

confidence_element.addEventListener("change", () => {
    const data = new FormData(confidence_element);
    const rating = Number(data.get("rating"));
    confidences[current_word] = rating;
})

update_deck();

for(let word of deck){
    set_word(word);
}

history = [];
set_word(deck[0]);
set_revealed(revealed);