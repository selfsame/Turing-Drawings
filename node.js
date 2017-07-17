var Canvas = require('canvas')
var fs = require('fs')
var path = require('path')
var LZWEncoder = require('./LZWEncoder.js')
var NeuQuant = require('./NeuQuant.js')
var GIFEncoder = require('./GIFEncoder.js')

console.log(LZWEncoder,NeuQuant,GIFEncoder)

const NUMSTATES  = 4
const NUMSYMBOLS = 3
const FRAMES = 30
var frame = 0

var encoder = new GIFEncoder();
encoder.setRepeat(0); //0  -> loop forever
encoder.setDelay(50); //go to next frame every n milliseconds
encoder.start();


/*****************************************************************************
*
*  This file is part of the Turing-Drawings project. The project is
*  distributed at:
*  https://github.com/maximecb/Turing-Drawings
*
*  Copyright (c) 2012, Maxime Chevalier-Boisvert. All rights reserved.
*
*  This software is licensed under the following license (Modified BSD
*  License):
*
*  Redistribution and use in source and binary forms, with or without
*  modification, are permitted provided that the following conditions are
*  met:
*   1. Redistributions of source code must retain the above copyright
*      notice, this list of conditions and the following disclaimer.
*   2. Redistributions in binary form must reproduce the above copyright
*      notice, this list of conditions and the following disclaimer in the
*      documentation and/or other materials provided with the distribution.
*   3. The name of the author may not be used to endorse or promote
*      products derived from this software without specific prior written
*      permission.
*
*  THIS SOFTWARE IS PROVIDED ``AS IS'' AND ANY EXPRESS OR IMPLIED
*  WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
*  MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN
*  NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT, INDIRECT,
*  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
*  NOT LIMITED TO PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
*  DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
*  THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
*  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
*  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*
*****************************************************************************/

//============================================================================
// Page interface code
//============================================================================


function escapeHTML(str)
{
    str = str.replace(/\n/g, '<br>');
    str = str.replace(/ /g, '&nbsp;');
    str = str.replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');

    return str;
}

/**
Encode an array of bytes into base64 string format
*/
function encodeBase64(data)
{
    assert (
        data instanceof Array,
        'invalid data array'
    );

    var str = '';

    function encodeChar(bits)
    {
        //console.log(bits);

        var ch;

        if (bits < 26)
            ch = String.fromCharCode(65 + bits);
        else if (bits < 52)
            ch = String.fromCharCode(97 + (bits - 26));
        else if (bits < 62)
            ch = String.fromCharCode(48 + (bits - 52));
        else if (bits === 62)
            ch = '+';
        else
            ch = '/';

        str += ch;
    }

    for (var i = 0; i < data.length; i += 3)
    {
        var numRem = data.length - i;

        // 3 bytes -> 4 base64 chars
        var b0 = data[i];
        var b1 = (numRem >= 2)? data[i+1]:0
        var b2 = (numRem >= 3)? data[i+2]:0

        var bits = (b0 << 16) + (b1 << 8) + b2;

        encodeChar((bits >> 18) & 0x3F);
        encodeChar((bits >> 12) & 0x3F);

        if (numRem >= 2)
        {
            encodeChar((bits >> 6) & 0x3F);

            if (numRem >= 3)
                encodeChar((bits >> 0) & 0x3F);
            else
                str += '=';
        }
        else
        {
            str += '==';
        }
    }

    return str;
}

function assert(condition, errorText)
{
    if (!condition)
    {
        error(errorText);
    }
}

/**
Abort execution because a critical error occurred
*/
function error(errorText)
{
    alert('ERROR: ' + errorText);

    throw errorText;
}

/**
Test that a value is integer
*/
function isInt(val)
{
    return (
        Math.floor(val) === val
    );
}

/**
Test that a value is a nonnegative integer
*/
function isNonNegInt(val)
{
    return (
        isInt(val) &&
        val >= 0
    );
}

/**
Test that a value is a strictly positive (nonzero) integer
*/
function isPosInt(val)
{
    return (
        isInt(val) &&
        val > 0
    );
}

/**
Get the current time in millisseconds
*/
function getTimeMillis()
{
    return (new Date()).getTime();
}

/**
Get the current time in seconds
*/
function getTimeSecs()
{
    return (new Date()).getTime() / 1000;
}

/**
Generate a random integer within [a, b]
*/
function randomInt(a, b)
{
    assert (
        isInt(a) && isInt(b) && a <= b,
        'invalid params to randomInt'
    );

    var range = b - a;

    var rnd = a + Math.floor(Math.random() * (range + 1));

    return rnd;
}

/**
Generate a random boolean
*/
function randomBool()
{
    return (randomInt(0, 1) === 1);
}

/**
Generate a random floating-point number within [a, b]
*/
function randomFloat(a, b)
{
    if (a === undefined)
        a = 0;
    if (b === undefined)
        b = 1;

    assert (
        a <= b,
        'invalid params to randomFloat'
    );

    var range = b - a;

    var rnd = a + Math.random() * range;

    return rnd;
}

/**
Generate a random value from a normal distribution
*/
function randomNorm(mean, variance)
{
	// Declare variables for the points and radius
    var x1, x2, w;

    // Repeat until suitable points are found
    do
    {
    	x1 = 2.0 * randomFloat() - 1.0;
    	x2 = 2.0 * randomFloat() - 1.0;
    	w = x1 * x1 + x2 * x2;
    } while (w >= 1.0 || w == 0);

    // compute the multiplier
    w = Math.sqrt((-2.0 * Math.log(w)) / w);
    
    // compute the gaussian-distributed value
    var gaussian = x1 * w;
    
    // Shift the gaussian value according to the mean and variance
    return (gaussian * variance) + mean;
}

/**
Choose a random argument value uniformly randomly
*/
function randomChoice()
{
    assert (
        arguments.length > 0,
        'must supply at least one possible choice'
    );

    var idx = randomInt(0, arguments.length - 1);

    return arguments[idx];
}

/**
Generate a weighed random choice function
*/
function genChoiceFn()
{
    assert (
        arguments.length > 0 && arguments.length % 2 === 0,
        'invalid argument count: ' + arguments.length
    );

    var numChoices = arguments.length / 2;

    var choices = [];
    var weights = [];
    var weightSum = 0;

    for (var i = 0; i < numChoices; ++i)
    {
        var choice = arguments[2*i];
        var weight = arguments[2*i + 1];

        choices.push(choice);
        weights.push(weight);

        weightSum += weight;
    }

    assert (
        weightSum > 0,
        'weight sum must be positive'
    );

    var limits = [];
    var limitSum = 0;

    for (var i = 0; i < weights.length; ++i)
    {
        var normWeight = weights[i] / weightSum;

        limitSum += normWeight;

        limits[i] = limitSum;
    }

    function choiceFn()
    {
        var r = Math.random();

        for (var i = 0; i < numChoices; ++i)
        {
            if (r < limits[i])
                return choices[i];
        }

        return choices[numChoices-1];
    }

    return choiceFn;
}

/**
Left-pad a string to a minimum length
*/
function leftPadStr(str, minLen, padStr)
{
    if (padStr === undefined)
        padStr = ' ';

    var str = String(str);

    while (str.length < minLen)
        str = padStr + str;

    return str;
}

/**
Resample and normalize an array of data points
*/
function resample(data, numSamples, outLow, outHigh, inLow, inHigh)
{
    // Compute the number of data points per samples
    var ptsPerSample = data.length / numSamples;

    // Compute the number of samples
    var numSamples = Math.floor(data.length / ptsPerSample);

    // Allocate an array for the output samples
    var samples = new Array(numSamples);

    // Extract the samples
    for (var i = 0; i < numSamples; ++i)
    {
        samples[i] = 0;

        var startI = Math.floor(i * ptsPerSample);
        var endI = Math.min(Math.ceil((i+1) * ptsPerSample), data.length);
        var numPts = endI - startI;

        for (var j = startI; j < endI; ++j)
            samples[i] += data[j];

        samples[i] /= numPts;
    }    

    // If the input range is not specified
    if (inLow === undefined && inHigh === undefined)
    {
        // Min and max sample values
        var inLow = Infinity;
        var inHigh = -Infinity;

        // Compute the min and max sample values
        for (var i = 0; i < numSamples; ++i)
        {
            inLow = Math.min(inLow, samples[i]);
            inHigh = Math.max(inHigh, samples[i]);
        }
    }

    // Compute the input range
    var iRange = (inHigh > inLow)? (inHigh - inLow):1;

    // Compute the output range
    var oRange = outHigh - outLow;

    // Normalize the samples
    samples.forEach(
        function (v, i) 
        {
            var normVal = (v - inLow) / iRange;
            samples[i] =  outLow + (normVal * oRange);
        }
    );

    // Return the normalized samples
    return samples;
}













var ACTION_LEFT  = 0;
var ACTION_RIGHT = 1;
var ACTION_UP    = 2;
var ACTION_DOWN  = 3;
var NUM_ACTIONS  = 4;

/*
N states, one start state
K symbols
4 actions (left, right up, down)

N x K -> N x K x A
*/
function Program(numStates, numSymbols, mapWidth, mapHeight)
{
    assert (
        numStates >= 1,
        'must have at least 1 state'
    );
    
    assert (
        numSymbols >= 2,
        'must have at least 2 symbols'
    );

    /// Number of states and symbols
    this.numStates = numStates;
    this.numSymbols = numSymbols;

    /// Image dimensions
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;

    /// Transition table
    this.table = new Int32Array(numStates * numSymbols * 3);

    /// Map (2D tape)
    this.map = new Int32Array(mapWidth * mapHeight); 

    // Generate random transitions
    for (var st = 0; st < numStates; ++st)
    {
        for (var sy = 0; sy < numSymbols; ++sy)
        {
            this.setTrans(
                st,
                sy,
                randomInt(0, numStates - 1),
                randomInt(1, numSymbols - 1),
                randomInt(0, NUM_ACTIONS - 1)
            );
        }
    }

    // Initialize the state
    this.reset();
}

Program.prototype.setTrans = function (st0, sy0, st1, sy1, ac1)
{
    var idx = (this.numStates * sy0 + st0) * 3;

    this.table[idx + 0] = st1;
    this.table[idx + 1] = sy1;
    this.table[idx + 2] = ac1;
}

Program.prototype.reset = function ()
{
    /// Start state
    this.state = 0;

    /// Top-left corner
    this.xPos = 0;
    this.yPos = 0;

    /// Iteration count
    this.itrCount = 0;

    // Initialize the image
    for (var i = 0; i < this.map.length; ++i)
        this.map[i] = 0;
}

Program.prototype.toString = function ()
{
    var str = this.numStates + ',' + this.numSymbols;

    for (var i = 0; i < this.table.length; ++i)
        str += ',' + this.table[i];

    return str;
}

Program.fromString = function (str, mapWidth, mapHeight)
{
    console.log(str);

    var nums = str.split(',').map(Number);

    numStates  = nums[0];
    numSymbols = nums[1];

    console.log('num states: ' + numStates);
    console.log('num symbols: ' + numSymbols);

    assert (
        numStates > 0 &&
        numSymbols > 0,
        'invalid input string'
    );

    var prog = new Program(numStates, numSymbols, mapWidth, mapHeight);

    assert (
        prog.table.length === nums.length - 2,
        'invalid transition table length'
    );

    for (var i = 0; i < prog.table.length; ++i)
        prog.table[i] = nums[i+2];

    return prog;
}

Program.prototype.update = function (numItrs)
{
    for (var i = 0; i < numItrs; ++i)
    {
        var sy = this.map[this.mapWidth * this.yPos + this.xPos];
        var st = this.state;

        var idx = (this.numStates * sy + st) * 3;
        var st = this.table[idx + 0];
        var sy = this.table[idx + 1];
        var ac = this.table[idx + 2];

        // Update the current state
        this.state = st;

        // Write the new symbol
        this.map[this.mapWidth * this.yPos + this.xPos] = sy;

        // Perform the transition action
        switch (ac)
        {
            case ACTION_LEFT:
            this.xPos += 1;
            if (this.xPos >= this.mapWidth)
                this.xPos -= this.mapWidth;
            break;

            case ACTION_RIGHT:
            this.xPos -= 1;
            if (this.xPos < 0)
                this.xPos += this.mapWidth;
            break;

            case ACTION_UP:
            this.yPos -= 1;
            if (this.yPos < 0)
                this.yPos += this.mapHeight;
            break;

            case ACTION_DOWN:
            this.yPos += 1;
            if (this.yPos >= this.mapHeight)
                this.yPos -= this.mapHeight;
            break;

            default:
            error('invalid action: ' + ac);
        }

        /*
        assert (
            this.xPos >= 0 && this.xPos < this.mapWidth,
            'invalid x position'
        );

        assert (
            this.yPos >= 0 && this.yPos < this.mapHeight,
            'invalid y position'
        );

        assert (
            this.state >= 0 && this.state < this.numStates,
            'invalid state'
        );
        */

        this.itrCount++;
    }
}































/**
Called after page load to initialize needed resources
*/
function init()
{
    // Get a reference to the canvas
    canvas = new Canvas(256, 256)


    // Set the canvas size
    canvas.width = 256;
    canvas.height = 256;

    // Get a 2D context for the drawing canvas
    canvas.ctx = canvas.getContext("2d");

    // Create an image data array
    canvas.imgData = canvas.ctx.createImageData(canvas.width, canvas.height);

    randomProg();

    // Set the update function to be called regularly
    updateInterv = setTimeout(
        updateRender,
        UPDATE_TIME
    );
}
//window.addEventListener("load", init, false);

/**
Generate a new random program
*/
function randomProg()
{
    var numStates = NUMSTATES
    var numSymbols = NUMSYMBOLS

    assert (
        numSymbols <= colorMap.length,
        colorMap.length + ' states currently supported'
    );

    console.log('num states: ' + numStates);
    console.log('num symbols: ' + numSymbols);

    program = new Program(numStates, numSymbols, canvas.width, canvas.height);
}

/**
Reset the program state
*/
function restartProg()
{
    program.reset();
}

// Default console logging function implementation
if (!console) console = {};
console.log = console.log || function(){};
console.warn = console.warn || function(){};
console.error = console.error || function(){};
console.info = console.info || function(){};

//============================================================================
// Image update code
//============================================================================

/**
Map of symbols (numbers) to colors
*/
var colorMap = [
    255,0  ,0  ,    // Initial symbol color
    0  ,0  ,0  ,    // Black
    255,255,255,    // White
    0  ,255,0  ,    // Green
    0  ,0  ,255,    // Blue
    255,255,0  ,
    0  ,255,255,
    255,0  ,255,
];

/***
Time per update, in milliseconds
*/
var UPDATE_TIME = 40;

/**
Maximum iterations per update
*/
var UPDATE_ITRS = 350000;

/**
Update the rendering
*/
function updateRender()
{
    var startTime = (new Date()).getTime();
    var startItrc = program.itrCount;

    // Until the update time is exhausted
    for (;;)
    {
        // Update the program
        program.update(5000);

        var curTime = (new Date()).getTime();
        var curItrc = program.itrCount;

        if (curItrc - startItrc >= UPDATE_ITRS ||
            curTime - startTime >= UPDATE_TIME)
            break;
    }

    /*
    console.log(
        'x: ' + program.xPos + 
        ', y: ' + program.yPos + 
        ', st: ' + program.curState +
        ', cc: ' + program.itrCount
    );
    */

    // Produce the image data
    var data = canvas.imgData.data;
    var map = program.map;
    for (var i = 0; i < map.length; ++i)
    {
        var sy = map[i];

        var r = colorMap[3 * sy + 0];
        var g = colorMap[3 * sy + 1];
        var b = colorMap[3 * sy + 2];

        data[4 * i + 0] = r;
        data[4 * i + 1] = g;
        data[4 * i + 2] = b;
        data[4 * i + 3] = 255;
    }

    assert (
        program.map.length * 4 === data.length,
        'invalid image data length'
    );

    // Show the image data
    canvas.ctx.putImageData(canvas.imgData, 0, 0);

    encoder.addFrame(canvas.ctx);
    
    //var out = fs.createWriteStream(path.join(__dirname, 'out/'+frame+'.png'))
    //canvas.pngStream().pipe(out)

    frame++
    if (frame < FRAMES){
    	setTimeout(
        updateRender,
        UPDATE_TIME
    	)
    } else { //selfsame

    	encoder.finish();
  		var binary_gif = encoder.stream().getData()
  		fs.writeFile("out.gif", binary_gif, "binary")
    }

}




init()




















