// Set color based on value being negative or positive
const setStyle = (number, ifNegative = "red", ifPositive = "green") => {
    if (number != 0) {
        return number < 0 ? "color:" + ifNegative : "color:" + ifPositive;
    }
};

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat
const formatter = new Intl.NumberFormat("sv-SE", {
    // style: 'currency',
    // currency: 'SEK',
    //notation: 'compact',
    //compactDisplay: 'short',
    // These options are needed to round to whole numbers if that's what you want.
    //minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
    maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
});

export { setStyle, formatter };
