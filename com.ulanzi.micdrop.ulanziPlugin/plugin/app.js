import {UlanzideckApi} from './actions/plugin-common-node/index.js'
import {execSync} from 'child_process'

const $UD = new UlanzideckApi()
const ACTIONS = {}

$UD.connect('com.ulanzi.micdrop')

/* —–– ACTION LIFECYCLE —–– */
$UD.onAdd(({context}) => {
    ACTIONS[context] ??= new MicDrop(context)
})
$UD.onRun(({context}) => ACTIONS[context]?.toggle())

/* —–– CLASS —–– */
class MicDrop {
    constructor (ctx) {
        this.ctx = ctx
        this.timer = setInterval(() => this.sync(), 800)
        this.sync()
    }

    macState () {
        try {
            return execSync(
                `osascript -e 'tell application "Mic Drop" to read'`
            ).toString().trim()
        } catch {
            return null
        }
    }

    toggle () {
        try {
            execSync(
                `osascript -e 'tell application "System Events" 
         to key code 46 using {shift down, command down}'`
            )
        } catch {
            execSync(`osascript -e 'tell application "Mic Drop" to toggle'`)
        }
        setTimeout(() => this.sync(), 250)
    }

    sync () {
        const st = this.macState()                // 'active' | 'muted' | null
        const s = st === 'muted' ? 1 : 0
        $UD.setStateIcon(this.ctx, s)
    }
}