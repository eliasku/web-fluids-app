export class Pointer {
    id = 0;
    startX = +0.0;
    startY = +0.0;
    prevX = +0.0;
    prevY = +0.0;
    x = +0.0;
    y = +0.0;
    down = false;
    active = false;
}

export class Input {
    readonly pointers: Pointer[] = [];

    constructor(readonly canvas: HTMLCanvasElement) {
        canvas.addEventListener("mousedown", (e) => {
            const scale = this.canvas.width / this.canvas.clientWidth;
            const bb = this.canvas.getBoundingClientRect();
            this.handleDown(this.getPointer(-1),
                ((e.clientX - bb.x) * scale) | 0,
                ((e.clientY - bb.y) * scale) | 0)
        });

        canvas.addEventListener("mouseup", (e) => {
            this.handleUp(this.getPointer(-1));
        });

        canvas.addEventListener("mouseleave", (e) => {
            this.handleUp(this.getPointer(-1));
        });

        canvas.addEventListener("mouseenter", (e) => {
            if(e.buttons) {
                const scale = this.canvas.width / this.canvas.clientWidth;
                const bb = this.canvas.getBoundingClientRect();
                this.handleDown(this.getPointer(-1),
                    ((e.clientX - bb.x) * scale) | 0,
                    ((e.clientY - bb.y) * scale) | 0)
            }
        });

        canvas.addEventListener("mousemove", (e) => {
            const scale = this.canvas.width / this.canvas.clientWidth;
            const bb = this.canvas.getBoundingClientRect();
            this.handleMove(this.getPointer(-1),
                ((e.clientX - bb.x) * scale) | 0,
                ((e.clientY - bb.y) * scale) | 0)
        });

        canvas.addEventListener("touchstart", (e) => {
            e.preventDefault();
            const scale = this.canvas.width / this.canvas.clientWidth;
            const bb = this.canvas.getBoundingClientRect();
            for (let i = 0; i < e.changedTouches.length; ++i) {
                const touch = e.changedTouches.item(i)!;
                this.handleDown(this.getPointer(touch.identifier),
                    ((touch.clientX - bb.x) * scale) | 0,
                    ((touch.clientY - bb.y) * scale) | 0);
            }
        });
        canvas.addEventListener("touchmove", (e) => {
            e.preventDefault();
            const scale = this.canvas.width / this.canvas.clientWidth;
            const bb = this.canvas.getBoundingClientRect();
            for (let i = 0; i < e.changedTouches.length; ++i) {
                const touch = e.changedTouches.item(i)!;
                this.handleMove(this.getPointer(touch.identifier),
                    ((touch.clientX - bb.x) * scale) | 0,
                    ((touch.clientY - bb.y) * scale) | 0);
            }
        }, false);
        canvas.addEventListener("touchend", (e) => {
            for (let i = 0; i < e.changedTouches.length; ++i) {
                const touch = e.changedTouches.item(i)!;
                this.handleUp(this.getPointer(touch.identifier));
            }
        });
        canvas.addEventListener("touchcancel", (e) => {
            for (let i = 0; i < e.changedTouches.length; ++i) {
                const touch = e.changedTouches.item(i)!;
                this.handleUp(this.getPointer(touch.identifier));
            }
        });
    }

    getPointer(id: number): Pointer {
        for (let i = 0; i < this.pointers.length; ++i) {
            if (this.pointers[i].id === id) {
                return this.pointers[i];
            }
        }
        const pointer = new Pointer();
        pointer.id = id;
        this.pointers.push(pointer);
        return pointer;
    }

    handleDown(pointer: Pointer, x: number, y: number) {
        pointer.x = x;
        pointer.y = y;
        pointer.prevX = x;
        pointer.prevY = y;
        pointer.startX = x;
        pointer.startY = y;
        pointer.down = true;
        pointer.active = true;
    }

    handleMove(pointer: Pointer, x: number, y: number) {
        pointer.prevX = pointer.x;
        pointer.prevY = pointer.y;
        pointer.x = x;
        pointer.y = y;
    }

    handleUp(pointer: Pointer) {
        pointer.down = false;
        pointer.active = false;
    }

}

