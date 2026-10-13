#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

readonly readme="README.md"
readonly begin_marker="<!-- BEGIN DIST SCRIPTS -->"
readonly end_marker="<!-- END DIST SCRIPTS -->"
readonly description_line="Ich versuche mir selbst das leben mit diesen scripten zu erleichern, während ich meine js kentinisse vertiefe."

block_file="$(mktemp)"
source_file="$(mktemp)"
output_file="$(mktemp)"
normalized_file="$(mktemp)"
trap 'rm -f "$block_file" "$source_file" "$output_file" "$normalized_file"' EXIT

metadata_value() {
    local key="$1"
    local script="$2"

    sed -nE "s|^[[:space:]]*//[[:space:]]*@${key}[[:space:]]+(.+)$|\\1|p" "$script" | head -n 1
}

{
    printf '%s\n' "$begin_marker"
    printf '## Skripte in `dist`\n\n'

    script_count=0
    library_count=0
    library_lines="$(mktemp)"
    trap 'rm -f "$block_file" "$source_file" "$output_file" "$normalized_file" "$library_lines"' EXIT

    while IFS= read -r -d '' script; do
        script="${script#./}"
        name="$(metadata_value name "$script")"
        description="$(metadata_value description "$script")"

        if [[ -n "$name" ]]; then
            printf -- '- [`%s`](%s)' "$name" "$script"
            if [[ -n "$description" ]]; then
                printf ' — %s' "$description"
            fi
            printf '\n'
            script_count=$((script_count + 1))
        else
            printf -- '- [`%s`](%s) — keine Userscript-Metadaten vorhanden\n' "${script#dist/}" "$script" >> "$library_lines"
            library_count=$((library_count + 1))
        fi
    done < <(find ./dist -type f -name '*.js' -print0 | sort -z)

    if [[ "$script_count" -eq 0 ]]; then
        printf '_Keine Userscripts in `dist` gefunden._\n'
    fi

    if [[ "$library_count" -gt 0 ]]; then
        printf '\n### Bibliotheken\n\n'
        cat "$library_lines"
    fi

    rm -f "$library_lines"
    printf '%s\n' "$end_marker"
} > "$block_file"

if grep -Fqx "$begin_marker" "$readme"; then
    awk -v begin="$begin_marker" -v end="$end_marker" '
        $0 == begin {
            while ((getline line < block) > 0) {
                print line
            }
            close(block)
            skip = 1
            next
        }
        $0 == end { skip = 0; next }
        !skip { print }
    ' block="$block_file" "$readme" > "$source_file"
else
    awk -v description="$description_line" -v block="$block_file" '
        {
            print
        }
        $0 == description {
            if ((getline empty_line) <= 0 || empty_line != "") {
                exit 1
            }
            print empty_line
            while ((getline line < block) > 0) {
                print line
            }
            close(block)
            inserted = 1
        }
        END {
            if (!inserted) {
                exit 1
            }
        }
    ' "$readme" > "$source_file"
fi

awk -v end="$end_marker" '
    $0 == end {
        print
        after_end = 1
        blank_seen = 0
        next
    }
    after_end && $0 == "" {
        if (!blank_seen) {
            print
            blank_seen = 1
        }
        next
    }
    {
        after_end = 0
        print
    }
' "$source_file" > "$normalized_file"

mv "$normalized_file" "$readme"
