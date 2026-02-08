enum SpecialInput {
  Epsilon,
  Any,
}
type InputToken = SpecialInput | string;
type NFAStateNode = {
  id: number;
  actions?: {
    name: string;
    immediate_confirm: boolean;
  }[];
  shifts?: Map<InputToken, NFAStateNode[]>;
};
type DFAStateNode = {
  id: string;
  actions?: {
    name: string;
    immediate_confirm: boolean;
  }[];
  shift?: Map<InputToken, DFAStateNode>;
};

class NodeIdIssuer {
  static #current_id = 0;

  static issue(): number {
    return NodeIdIssuer.#current_id++;
  }
}

function build_nfa(
  sequence: string[],
  action_node: NFAStateNode,
): NFAStateNode {
  const start: NFAStateNode = { id: NodeIdIssuer.issue() };
  let current = start;
  for (const [index, input] of sequence.entries()) {
    const next: NFAStateNode =
      index === sequence.length - 1
        ? action_node
        : { id: NodeIdIssuer.issue() };
    current.shifts = new Map([[input, [next]]]);
    current = next;
  }
  return start;
}

function epsilon_closure(start: Set<NFAStateNode>): Set<NFAStateNode> {
  const stack = Array.from(start.values());
  while (stack.length > 0) {
    const node = stack.shift()!;
    if (node.shifts === undefined) {
      continue;
    }
    for (const [input, targets] of node.shifts) {
      if (input !== SpecialInput.Epsilon) {
        continue;
      }
      for (const target of targets) {
        if (!start.has(target)) {
          start.add(target);
          stack.push(target);
        }
      }
    }
  }
  return start;
}

function calculate_dfa_id(nfa_nodes: Set<NFAStateNode>): string {
  return Array.from(nfa_nodes, (node) => node.id)
    .toSorted()
    .join(", ");
}
function collect_dfa_actions(
  nfa_nodes: Set<NFAStateNode>,
): NFAStateNode["actions"] {
  const result: NFAStateNode["actions"] = [];
  for (const node of nfa_nodes) {
    result.push(...(node.actions ?? []));
  }
  if (result.length === 0) {
    return undefined;
  }
  return result;
}

function nfa_to_dfa(start_state: NFAStateNode): {
  entry: DFAStateNode;
  nodes: DFAStateNode[];
} {
  const entry_closure = epsilon_closure(new Set([start_state]));
  const entry: DFAStateNode = {
    id: calculate_dfa_id(entry_closure),
    actions: collect_dfa_actions(entry_closure),
  };
  const states_to_evaluate: [Set<NFAStateNode>, DFAStateNode][] = [
    [entry_closure, entry],
  ];
  const state_map: Map<string, DFAStateNode> = new Map([[entry.id, entry]]);
  while (states_to_evaluate.length > 0) {
    const [state_closure, state_node] = states_to_evaluate.shift()!;

    const effective_inputs = new Set<InputToken>();
    for (const node of state_closure) {
      for (const input of node.shifts?.keys() ?? []) {
        effective_inputs.add(input);
      }
    }

    for (const input of effective_inputs) {
      if (input === SpecialInput.Epsilon) {
        continue;
      }

      const destination = new Set<NFAStateNode>();
      for (const node of state_closure) {
        if (node.shifts === undefined) {
          continue;
        }
        for (const target of node.shifts.get(input) ?? []) {
          destination.add(target);
        }
        for (const target of node.shifts.get(SpecialInput.Any) ?? []) {
          destination.add(target);
        }
      }
      const new_state_closure = epsilon_closure(destination);
      const new_state_id = calculate_dfa_id(new_state_closure);
      const existing_state = state_map.get(new_state_id);
      if (existing_state === undefined) {
        const new_state_node: DFAStateNode = {
          id: new_state_id,
          actions: collect_dfa_actions(new_state_closure),
        };
        state_map.set(new_state_id, new_state_node);
        states_to_evaluate.push([new_state_closure, new_state_node]);
      }

      if (state_node.shift === undefined) {
        state_node.shift = new Map();
      }
      state_node.shift.set(input, state_map.get(new_state_id)!);
    }
  }
  return { entry, nodes: [...state_map.values()] };
}

function simplify_dfa(entry: DFAStateNode, nodes: DFAStateNode[]) {
  type NodeSet = {
    id: string;
    nodes: DFAStateNode[];
  };
  const node_to_set: Map<string, NodeSet> = new Map();
  const node_sets: NodeSet[] = [];
  {
    const acceptance_nodes = nodes.filter(
      ({ actions }) => actions !== undefined,
    );
    const nonacceptance_nodes = nodes.filter(
      ({ actions }) => actions === undefined,
    );
    const initial_nonacceptance: NodeSet = {
      id: crypto.randomUUID(),
      nodes: nonacceptance_nodes,
    };
    for (const node of nonacceptance_nodes) {
      node_to_set.set(node.id, initial_nonacceptance);
    }
    node_sets.push(initial_nonacceptance);

    const acceptance_map: Map<string, DFAStateNode[]> = new Map();
    for (const node of acceptance_nodes) {
      const actions = node.actions!.map(({ name }) => name).toSorted();
      const key = actions.join("\u0000");
      const existing = acceptance_map.get(key);
      if (existing === undefined) {
        acceptance_map.set(key, [node]);
      } else {
        existing.push(node);
      }
    }
    for (const nodes of acceptance_map.values()) {
      const group: NodeSet = {
        id: crypto.randomUUID(),
        nodes,
      };
      for (const node of nodes) {
        node_to_set.set(node.id, group);
      }
      node_sets.push(group);
    }
  }

  const possible_inputs_temporary: Set<InputToken> = new Set();
  for (const node of nodes) {
    for (const input of node.shift?.keys() ?? []) {
      possible_inputs_temporary.add(input);
    }
  }
  const possible_inputs = [...possible_inputs_temporary.values()];

  let modified = false;
  do {
    modified = false;

    const new_groups = [];

    for (const group of node_sets) {
      const destination_mapping: Map<string, DFAStateNode[]> = new Map();
      for (const node of group.nodes) {
        const shift = node.shift!;
        const results = possible_inputs.map((input) => {
          const target = shift.get(input) ?? shift.get(SpecialInput.Any)!;
          return node_to_set.get(target.id)!.id;
        });
        const result = results.join("\u0000");
        const existing = destination_mapping.get(result);
        if (existing === undefined) {
          destination_mapping.set(result, [node]);
        } else {
          existing.push(node);
        }
      }
      if (destination_mapping.size === 1) {
        new_groups.push(group);
        continue;
      }
      for (const new_group_nodes of destination_mapping.values()) {
        const new_group: NodeSet = {
          id: crypto.randomUUID(),
          nodes: new_group_nodes,
        };
        for (const node of new_group_nodes) {
          node_to_set.set(node.id, new_group);
        }
        modified = true;
        new_groups.push(new_group);
      }
    }

    node_sets.splice(0, node_sets.length, ...new_groups);
  } while (modified);

  const get_group_delegate = (group: NodeSet): DFAStateNode => {
    return group.nodes.includes(entry) ? entry : group.nodes[0]!;
  };

  for (const group of node_sets) {
    const delegate = get_group_delegate(group);
    if (delegate.actions) {
      const collected_actions: Set<string> = new Set(
        delegate.actions.map(({ name }) => name),
      );
      for (const node of group.nodes) {
        for (const action of node.actions!) {
          if (!collected_actions.has(action.name)) {
            delegate.actions.push(action);
            collected_actions.add(action.name);
          }
        }
      }
    }

    for (const input of possible_inputs) {
      const current = delegate.shift!.get(input);
      if (current !== undefined) {
        delegate.shift!.set(
          input,
          get_group_delegate(node_to_set.get(current.id)!),
        );
      }
    }
  }
  return entry;
}

function finish_visualization(content: string): string {
  return `digraph Automaton {
  rankdir=LR;
  overlap=false;
  splines=true;
  node [shape=circle, fixedsize=false];
  edge [arrowsize=0.4, penwidth=0.8];

  start [shape=point, width=0.1];

  ${content}
}`;
}

function visualize_nfa(start: NFAStateNode): string {
  const lines: string[] = [`start -> "${start.id}";`];
  const visited: Set<number> = new Set([start.id]);
  const to_visit: NFAStateNode[] = [start];
  while (to_visit.length > 0) {
    const node = to_visit.shift()!;
    lines.push(
      `  "${node.id}" [label="${node.id}${node.actions ? String.raw`\n` + node.actions.map(({ name }) => name).join(String.raw`\n`) : ""}"${node.actions ? " shape=doublecircle" : ""}];`,
    );
    for (const [input, targets] of node.shifts ?? []) {
      const label = (() => {
        if (input === SpecialInput.Any) {
          return "ANY";
        }
        if (input === SpecialInput.Epsilon) {
          return "ε";
        }
        return input;
      })();
      for (const target of targets) {
        lines.push(`  "${node.id}" -> "${target.id}" [label="${label}"];`);
        if (!visited.has(target.id)) {
          visited.add(target.id);
          to_visit.push(target);
        }
      }
    }
  }
  return finish_visualization(lines.join("\n"));
}

function visualize_dfa(start: DFAStateNode): string {
  const lines: string[] = [`start -> "${start.id}";`];
  const visited: Set<string> = new Set([start.id]);
  const to_visit: DFAStateNode[] = [start];
  while (to_visit.length > 0) {
    const node = to_visit.shift()!;
    lines.push(
      `  "${node.id}" [label="${node.id}${node.actions ? String.raw`\n` + node.actions.map(({ name }) => name).join(String.raw`\n`) : ""}"${node.actions ? " shape=doublecircle" : ""}];`,
    );
    for (const [input, target] of node.shift ?? []) {
      const label = (() => {
        if (input === SpecialInput.Any) {
          return "ANY";
        }
        if (input === SpecialInput.Epsilon) {
          return "ε";
        }
        return input;
      })();
      lines.push(`  "${node.id}" -> "${target.id}" [label="${label}"];`);
      if (!visited.has(target.id)) {
        visited.add(target.id);
        to_visit.push(target);
      }
    }
  }
  return finish_visualization(lines.join("\n"));
}

type SweetPresserConfig = {
  sequence_timeout: number;
  confirm_timeout: number;
  reset_on_action: boolean;
  on_state_change?: (source: string, destination: string) => void;
  on_reset?: (reason: ResetReason) => void;
};
enum ResetReason {
  NormalProceed = "normal proceed",
  Timeout = "timeout",
  Confirmed = "confirmed",
}
export class SweetPresser {
  #entry: DFAStateNode;
  #current_node: DFAStateNode;
  #config: SweetPresserConfig;
  #pending_operations: number[];
  #callback: (id: string, name: string[]) => void;

  private constructor(
    dfa: DFAStateNode,
    callback: (id: string, name: string[]) => void,
    options: SweetPresserConfig,
  ) {
    this.#entry = dfa;
    this.#current_node = dfa;
    this.#config = options;
    this.#pending_operations = [];
    this.#callback = callback;
  }

  static build(
    actions:
      | {
          name: string;
          sequences: string[][];
          confirm?: "default" | "immediate";
        }[]
      | string,
    callback: (id: string, name: string[]) => void,
    options?: {
      // number of milliseconds allowed between each two inputs before the input sequence is reset
      sequence_timeout?: number;
      // time to wait before default confirmation
      //  this must be less than sequence_timeout
      confirm_timeout?: number;
      // should the progress reset on action taken
      //  say two actions were defined: abc -> A and bca -> B
      //  should input sequence abca generate A instead of AB?
      reset_on_action?: boolean;
      // callback when state is changed
      on_state_change?: (source: string, destination: string) => void;
      // callback when state is reset
      on_reset?: (reason: ResetReason) => void;
    },
  ): SweetPresser {
    const dfa =
      typeof actions === "string"
        ? SweetPresser.load_dfa(actions)
        : SweetPresser.build_dfa(actions);

    return new SweetPresser(dfa, callback, {
      sequence_timeout: options?.sequence_timeout ?? 100,
      confirm_timeout: options?.confirm_timeout ?? 50,
      reset_on_action: options?.reset_on_action ?? false,
      on_state_change: options?.on_state_change,
      on_reset: options?.on_reset,
    });
  }

  private static build_dfa(
    actions: {
      name: string;
      sequences: string[][];
      confirm?: "default" | "immediate";
    }[],
  ) {
    const initial: NFAStateNode = { id: NodeIdIssuer.issue() };
    initial.shifts = new Map([[SpecialInput.Any, [initial]]]);
    const sequence_nfa: NFAStateNode[] = [];
    for (const action of actions) {
      const action_node: NFAStateNode = {
        id: NodeIdIssuer.issue(),
        actions: [
          {
            name: action.name,
            immediate_confirm: (action.confirm ?? "default") === "immediate",
          },
        ],
      };
      for (const sequence of action.sequences) {
        sequence_nfa.push(build_nfa(sequence, action_node));
      }
    }
    initial.shifts.set(SpecialInput.Epsilon, sequence_nfa);

    const { entry: baseline_dfa, nodes: baseline_dfa_nodes } =
      nfa_to_dfa(initial);

    const final_dfa = simplify_dfa(baseline_dfa, baseline_dfa_nodes);
    return final_dfa;
  }

  private static load_dfa(dumped: string) {
    const { nodes, shift, entry } = JSON.parse(dumped) as {
      nodes: { id: string; actions?: DFAStateNode["actions"] }[];
      shift: { input: InputToken; source: string; destination: string }[];
      entry: string;
    };
    const node_map: Map<string, DFAStateNode> = new Map();
    for (const node of nodes) {
      const constructed_node: DFAStateNode = {
        id: node.id,
        actions: node.actions,
      };
      node_map.set(node.id, constructed_node);
    }
    for (const edge of shift) {
      const { input, source: source_id, destination: destination_id } = edge;
      const source = node_map.get(source_id)!;
      const destination = node_map.get(destination_id)!;
      if (source.shift === undefined) {
        source.shift = new Map();
      }
      source.shift.set(input, destination);
    }
    return node_map.get(entry)!;
  }

  config(options?: {
    sequence_timeout?: number;
    confirm_timeout?: number;
    reset_on_action?: boolean;
    on_state_change?: (source: string, destination: string) => void;
    on_reset?: (reason: ResetReason) => void;
  }) {
    if (options?.reset_on_action !== undefined) {
      this.#config.reset_on_action = options.reset_on_action;
    }
    if (options?.confirm_timeout !== undefined) {
      this.#config.confirm_timeout = options.confirm_timeout;
    }
    if (options?.sequence_timeout !== undefined) {
      this.#config.sequence_timeout = options.sequence_timeout;
    }
    if (options?.on_state_change !== undefined) {
      this.#config.on_state_change = options.on_state_change;
    }
    if (options?.on_reset !== undefined) {
      this.#config.on_reset = options.on_reset;
    }
  }

  visualize(): string {
    return visualize_dfa(this.#entry);
  }

  feed(input: string) {
    for (const pending_operation of this.#pending_operations) {
      clearTimeout(pending_operation);
    }
    this.#pending_operations.splice(0);

    const shift_table = this.#current_node.shift!;
    const target = shift_table.get(input) ?? shift_table.get(SpecialInput.Any)!;
    this.#config.on_state_change?.call(
      undefined,
      this.#current_node.id,
      target.id,
    );
    this.#current_node = target;
    if (target === this.#entry) {
      this.#config.on_reset?.call(undefined, ResetReason.NormalProceed);
    }

    const immediate_actions: string[] = [];
    const async_actions: string[] = [];
    for (const action of target.actions ?? []) {
      if (action.immediate_confirm) {
        immediate_actions.push(action.name);
      } else {
        async_actions.push(action.name);
      }
      const id = crypto.randomUUID();
      this.#callback(id, immediate_actions);
      if (immediate_actions.length > 0 && this.#config.reset_on_action) {
        this.#current_node = this.#entry;
        this.#config.on_reset?.call(undefined, ResetReason.Confirmed);
      }
      if (async_actions.length > 0) {
        this.#pending_operations.push(
          setTimeout(() => {
            this.#callback(id, async_actions);
            if (this.#config.reset_on_action) {
              this.#current_node = this.#entry;
              this.#config.on_reset?.call(undefined, ResetReason.Confirmed);
            }
          }, this.#config.confirm_timeout),
        );
      }
    }
    if (this.#current_node !== this.#entry) {
      this.#pending_operations.push(
        setTimeout(() => {
          this.#current_node = this.#entry;
          this.#config.on_reset?.call(undefined, ResetReason.Timeout);
        }, this.#config.sequence_timeout),
      );
    }
  }

  dump(): string {
    const nodes: { id: string; actions?: DFAStateNode["actions"] }[] = [];
    const shift: { input: InputToken; source: string; destination: string }[] =
      [];
    const visited: Set<string> = new Set([this.#entry.id]);
    const to_visit: DFAStateNode[] = [this.#entry];
    while (to_visit.length > 0) {
      const node = to_visit.shift()!;
      nodes.push({
        id: node.id,
        actions: node.actions,
      });
      for (const [input, target] of node.shift ?? []) {
        shift.push({ input, source: node.id, destination: target.id });
        if (!visited.has(target.id)) {
          visited.add(target.id);
          to_visit.push(target);
        }
      }
    }
    return JSON.stringify({
      nodes,
      shift,
      entry: this.#entry.id,
    });
  }
}
