# test case visualizer

a webapp, a react website to visualize simple test cases

## roadmap

design
program (mainly vibe coding)

debug (need human)

deploy (on vercel...)

(desktop app version if possible)

## dev env

qwen code

Manjaro Linux x86_64

vscode copilot agent mode

## design

### input

type: text
a typical test case used in debugging

use textarea to accept input

like

```python
[1, 2, ["a", 0]]
```

### optional input data type selection

the app should recognize common data type, and also support manual type select

select from common data types

* array
* linked list
* dynamic array
* matrix
* tensor
* table (csv)
* tree
* forest
* graph
* custom (given to LLM? not in todo list for now)

### output

visualization of that test case after pressing visualize button

there is a main display showing the structure
for 2d data structures there should be fold/unfold features
for 3d data structures there should be rotate and zoom functions

and a side panel showing information like data type, shape...
a REPL submenu, could be very useful
for example, if A is an array of tensor, typing A[0] in REPL submenu would display A[0] in main display and its info in side menu

### features

supported languages: first python, then C++, then others

auto recognize input data type

recursive parsing for nested python list

suggest common typos

optional AI support: let LLM code a program to visualize special data and display the result

## input area

an input area

optionally, select from common data type, and see example shown in input box

## visualizing area

left top, user input

right top, side panel showing properties of user input, and a REPL

bottom, the visualizing area

## references

[https://pythontutor.com/render.html#mode=edit](https://pythontutor.com/render.html#mode=edit)

the visualizing feature is neat, but only for python code in run
