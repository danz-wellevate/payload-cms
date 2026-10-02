// Languages offered in the playground. `id` is the Judge0 CE language id
// (see https://ce.judge0.com/languages), `monaco` is the editor's syntax mode.
export type PlaygroundLanguage = {
  id: number
  label: string
  monaco: string
  starter: string
}

export const languages: PlaygroundLanguage[] = [
  {
    id: 109,
    label: 'Python 3.13',
    monaco: 'python',
    starter: `import sys

data = sys.stdin.read().split()

print("Hello, World!")
`,
  },
  {
    id: 102,
    label: 'JavaScript (Node.js 22)',
    monaco: 'javascript',
    starter: `const data = require('fs').readFileSync(0, 'utf8').trim().split(/\\s+/)

console.log('Hello, World!')
`,
  },
  {
    id: 101,
    label: 'TypeScript 5.6',
    monaco: 'typescript',
    starter: `declare const require: any

const data: string[] = require('fs').readFileSync(0, 'utf8').trim().split(/\\s+/)

console.log('Hello, World!')
`,
  },
  {
    id: 91,
    label: 'Java 17',
    monaco: 'java',
    starter: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);

        System.out.println("Hello, World!");
    }
}
`,
  },
  {
    id: 105,
    label: 'C++ (GCC 14)',
    monaco: 'cpp',
    starter: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    cout << "Hello, World!" << endl;
    return 0;
}
`,
  },
  {
    id: 103,
    label: 'C (GCC 14)',
    monaco: 'c',
    starter: `#include <stdio.h>

int main(void) {
    printf("Hello, World!\\n");
    return 0;
}
`,
  },
  {
    id: 107,
    label: 'Go 1.23',
    monaco: 'go',
    starter: `package main

import (
	"bufio"
	"fmt"
	"os"
)

func main() {
	reader := bufio.NewReader(os.Stdin)
	_ = reader

	fmt.Println("Hello, World!")
}
`,
  },
  {
    id: 108,
    label: 'Rust 1.85',
    monaco: 'rust',
    starter: `use std::io::{self, Read};

fn main() {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).unwrap();

    println!("Hello, World!");
}
`,
  },
  {
    id: 51,
    label: 'C# (Mono 6.6)',
    monaco: 'csharp',
    starter: `using System;

public class Program {
    public static void Main() {
        string input = Console.In.ReadToEnd();

        Console.WriteLine("Hello, World!");
    }
}
`,
  },
]

export const findLanguage = (id: number) => languages.find((language) => language.id === id)
