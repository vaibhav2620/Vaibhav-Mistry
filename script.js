document.addEventListener("DOMContentLoaded", function () {
    const options = document.querySelectorAll(".toggle-container input");
    const slider = document.querySelector(".toggle-slider");
    const container = document.querySelector(".toggle-container");

    // Margin to prevent slider from touching edges
    const sliderMargin = 5;

    function updateSlider() {
        const totalOptions = options.length;
        const containerWidth = container.clientWidth;
        const optionWidth = (containerWidth - (2 * sliderMargin)) / totalOptions;

        // Set slider width dynamically
        slider.style.width = `${optionWidth}px`;

        options.forEach((option, index) => {
            if (option.checked) {
                let leftPosition = sliderMargin + (index * optionWidth);
                if (index === totalOptions - 1) {
                    leftPosition = containerWidth - optionWidth - sliderMargin;
                }
                slider.style.left = `${leftPosition}px`;

                // Show only the selected category's products
                updateVisibility(option.value);
            }
        });
    }

    function updateVisibility(selectedCategory) {
        // Convert the selected category to match product IDs
        selectedCategory = selectedCategory.trim();

        document.querySelectorAll(".product").forEach(product => {
            const productCategory = product.id.trim(); // Fix inconsistent spacing in ID attributes
            
            if (productCategory === selectedCategory || selectedCategory === "all") {
                product.classList.remove("hidden");
            } else {
                product.classList.add("hidden");
            }
        });
    }

    // Attach event listeners to all radio inputs
    options.forEach(option => {
        option.addEventListener("change", updateSlider);
    });

    // Ensure everything is properly calculated when resizing the window
    window.addEventListener("resize", updateSlider);

    // Initialize everything on page load
    updateSlider();
});
