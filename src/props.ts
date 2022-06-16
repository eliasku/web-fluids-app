export class Property {
    constructor(
        public target: any,
        readonly name: string,
        readonly min?: number,
        readonly max?: number,
        readonly multiplier = 1.0) {

    }
}

export function range(prop: Property) {
    const p = document.createElement("div");
    p.style.marginLeft = "10px";
    const label = document.createElement("label");
    const input = document.createElement("input");
    const output = document.createElement("output");
    label.htmlFor = prop.name;
    label.innerText = prop.name;
    if (prop.multiplier !== 1.0) {
        label.innerText += " (* " + prop.multiplier.toExponential() + ")";
    }
    p.appendChild(label);
    label.style.display = "inline-block";
    label.style.width = "200px";
    p.appendChild(input);
    input.style.display = "inline-block";
    input.style.verticalAlign = "middle";
    output.style.display = "inline-block";
    output.style.verticalAlign = "middle";
    p.appendChild(output);

    input.id = prop.name;
    input.type = "range";
    if (prop.min) {
        input.min = (prop.min / prop.multiplier).toString();
    }
    if (prop.max) {
        input.max = (prop.max / prop.multiplier).toString();
    }
    input.value = (prop.target[prop.name] / prop.multiplier).toString();
    output.innerText = input.value;
    input.oninput = (ev) => {
        const val = input.value;
        const num = Number.parseFloat(val) * prop.multiplier;
        output.innerText = num.toString();
        if (prop.target) {
            prop.target[prop.name] = num;
            if(("on_" + prop.name) in prop.target) {
                prop.target["on_" + prop.name]();
            }
        }
    };

    return p;
}

export function combo(target: any, name: string, options: string[]) {
    const p = document.createElement("div");
    p.style.marginLeft = "10px";
    const label = document.createElement("label");
    label.innerText = name;
    const select = document.createElement("select");
    for (let i = 0; i < options.length; ++i) {
        const option = document.createElement("option");
        option.value = i.toString();
        option.innerText = options[i];
        select.appendChild(option);
    }
    select.value = target[name].toString();
    select.onchange = (ev) => {
        const idx = Number.parseInt(select.value);
        target[name] = idx;
    };
    label.appendChild(select);
    p.appendChild(label);
    return p;
}

export function group(label: string, ...args: any[]) {
    const div = document.createElement("div");
    div.innerText = label;
    div.style.marginLeft = "10px";
    for (const el of args) {
        if (el instanceof HTMLElement) {
            div.appendChild(el);
        }
    }
    return div;
}