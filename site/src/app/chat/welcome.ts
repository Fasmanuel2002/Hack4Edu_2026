import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Logo } from '../shared/logo';

/** Top of the empty-chat screen: the small mark and the greeting. The composer comes next. */
@Component({
  selector: 'app-welcome',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Logo],
  templateUrl: './welcome.html',
  styleUrl: './welcome.css',
})
export class Welcome {}
