(function() {
    var Menu,
        slice = [].slice;

    Menu = (function() {
        function Menu(button) {
            this.button = button;
            this.elem = $(".menu.template").clone().removeClass("template");
            this.elem.appendTo("body");
            this.items = [];
        }

        Menu.prototype.show = function() {
            var button_pos;
            if (window.visible_menu && window.visible_menu.button[0] === this.button[0]) {
                window.visible_menu.hide();
                return this.hide();
            } else {
                button_pos = this.button.offset();
                // this.elem.css({
                //     "top": button_pos.top + this.button.outerHeight(),
                //     "left": button_pos.left + this.button.outerWidth() + this.elem.outerWidth()
                // });
                this.button.addClass("menu-active");
                this.elem.addClass("visible");
                if (window.visible_menu) {
                    window.visible_menu.hide();
                }
                return window.visible_menu = this;
            }
        };

        Menu.prototype.hide = function() {
            this.elem.removeClass("visible");
            this.button.removeClass("menu-active");
            return window.visible_menu = null;
        };

        Menu.prototype.addItem = function(title, cb) {
            var item;
            item = $(".menu-item.template", this.elem).clone().removeClass("template");
            item.html(title);
            item.on("click", (function(_this) {
                return function() {
                    if (!cb(item)) {
                        _this.hide();
                    }
                    return false;
                };
            })(this));
            item.appendTo(this.elem);
            this.items.push(item);
            return item;
        };

        Menu.prototype.log = function() {
            var args;
            args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
            return console.log.apply(console, ["[Menu]"].concat(slice.call(args)));
        };

        return Menu;

    })();

    window.Menu = Menu;

    $("html").on("click", function(e) {
        if (window.visible_menu && e.target !== window.visible_menu.button[0] && $(e.target).parent()[0] !== window.visible_menu.elem[0]) {
            return window.visible_menu.hide();
        }
    });

}).call(this);