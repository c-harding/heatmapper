#/usr/bin/env bash

close_all() {
    close_one='tmux send-keys -t "$1" C-c'
    tmux lsp -F "#D" | grep -v "$TMUX_PANE" | xargs -L1 bash -c $close_one close_one
}
escape() {
    printf "%q " "$@"
}
wrapper() {
    trap "trap - INT; close_all" INT
    $@
    exit_code=$?
    trap - INT

    # If wasn’t sigint, stay open
    [ $exit_code -ne 130 ] && (
        if [ $exit_code -eq 0 ]
        then echo "[Process completed successfully, press any key to close]"
        else echo "[Process exited with code $exit_code, press any key to quit]"
        fi
        read
    )
}
wrap() {
    declare -f close_all
    declare -f escape
    declare -f wrapper
    escape wrapper "$@"
}

if ! command -v tmux &> /dev/null
then
    echo "Please install tmux to continue" >&2
    exit 1
fi

cd "${0%/*}"

# wrap yarn serve

tmux new-session    -c client "$(wrap yarn serve)" \;\
    split-window -v -c server "$(wrap yarn serve)"
