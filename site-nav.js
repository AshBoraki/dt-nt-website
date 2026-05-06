(() => {
    const mobileQuery = window.matchMedia("(max-width: 900px)");

    document.querySelectorAll("[data-site-nav]").forEach((nav) => {
        const shell = nav.closest(".nav-shell");
        const toggle = shell ? shell.querySelector("[data-nav-toggle]") : null;

        if (!toggle) {
            return;
        }

        const closeMenu = () => {
            nav.classList.remove("is-open");
            toggle.setAttribute("aria-expanded", "false");
        };

        const openMenu = () => {
            nav.classList.add("is-open");
            toggle.setAttribute("aria-expanded", "true");
        };

        const syncLayout = () => {
            if (!mobileQuery.matches) {
                closeMenu();
            }
        };

        toggle.addEventListener("click", () => {
            const expanded = toggle.getAttribute("aria-expanded") === "true";
            if (expanded) {
                closeMenu();
                return;
            }

            openMenu();
        });

        nav.querySelectorAll("a").forEach((link) => {
            link.addEventListener("click", closeMenu);
        });

        document.addEventListener("click", (event) => {
            if (!mobileQuery.matches) {
                return;
            }

            if (nav.contains(event.target) || toggle.contains(event.target)) {
                return;
            }

            closeMenu();
        });

        document.addEventListener("keydown", (event) => {
            if (event.key !== "Escape") {
                return;
            }

            if (toggle.getAttribute("aria-expanded") !== "true") {
                return;
            }

            closeMenu();
            toggle.focus();
        });

        window.addEventListener("resize", syncLayout);
        syncLayout();
    });
})();
